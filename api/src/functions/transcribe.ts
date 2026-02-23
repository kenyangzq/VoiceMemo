import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

// Logger helper
function log(context: InvocationContext, message: string, data?: Record<string, unknown>) {
  const logData = data ? JSON.stringify(data) : '';
  context.log(`[Transcribe] ${message} ${logData}`);
}

app.http('transcribe', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'transcribe',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const requestStart = Date.now();
    log(context, '=== Transcription request started ===');

    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION || 'eastus2';

    log(context, 'Configuration check', {
      hasKey: !!speechKey,
      keyPrefix: speechKey?.slice(0, 10) + '...',
      region: speechRegion,
    });

    if (!speechKey || speechKey === 'your-azure-speech-key-here') {
      log(context, 'ERROR: AZURE_SPEECH_KEY not configured');
      return { status: 500, body: 'AZURE_SPEECH_KEY not configured' };
    }

    try {
      const formData = await request.formData();
      const audioFile = formData.get('audio');
      const rawLanguage = formData.get('language') as string;

      // Explicitly validate and set language - ensure zh-CN is not treated as falsy
      const language = (rawLanguage === 'zh-CN' || rawLanguage === 'en-US') ? rawLanguage : 'en-US';

      log(context, 'Received form data', {
        hasAudioFile: !!audioFile,
        audioFileType: audioFile instanceof File ? audioFile.type : typeof audioFile,
        isBlob: audioFile instanceof Blob,
        rawLanguage,
        finalLanguage: language,
      });

      if (!audioFile || !(audioFile instanceof Blob)) {
        log(context, 'ERROR: No valid audio file provided');
        return { status: 400, body: 'No audio file provided' };
      }

      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioFile.arrayBuffer();

      log(context, 'Audio buffer details', {
        bufferSize: arrayBuffer.byteLength,
        bufferSizeKB: Math.round(arrayBuffer.byteLength / 1024),
        mimeType: audioFile instanceof File ? audioFile.type : 'unknown',
      });

      // Validate audio size (Azure Speech has limits)
      const MIN_SIZE = 1024; // 1KB minimum
      const MAX_SIZE = 25 * 1024 * 1024; // 25MB maximum

      if (arrayBuffer.byteLength < MIN_SIZE) {
        log(context, 'ERROR: Audio file too small', { byteLength: arrayBuffer.byteLength });
        return {
          status: 400,
          body: `Audio file too small (${arrayBuffer.byteLength} bytes). Minimum ${MIN_SIZE} bytes required.`,
        };
      }

      if (arrayBuffer.byteLength > MAX_SIZE) {
        log(context, 'ERROR: Audio file too large', { byteLength: arrayBuffer.byteLength });
        return {
          status: 400,
          body: `Audio file too large (${arrayBuffer.byteLength} bytes). Maximum ${MAX_SIZE} bytes allowed.`,
        };
      }

      // Configure speech recognition
      log(context, 'Configuring speech recognition', { language });
      const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
      speechConfig.speechRecognitionLanguage = language;

      log(context, 'Speech config set', {
        recognitionLanguage: speechConfig.speechRecognitionLanguage,
      });

      // WAV files have a 44-byte header, skip it to get raw PCM data
      const WAV_HEADER_SIZE = 44;

      // Validate WAV header before skipping
      if (arrayBuffer.byteLength < WAV_HEADER_SIZE) {
        log(context, 'ERROR: Audio file too small to be valid WAV');
        return { status: 400, body: 'Audio file too small to be valid WAV format' };
      }

      // Check RIFF header
      const view = new DataView(arrayBuffer);
      const riff = String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3)
      );
      const wave = String.fromCharCode(
        view.getUint8(8),
        view.getUint8(9),
        view.getUint8(10),
        view.getUint8(11)
      );

      log(context, 'WAV header validation', {
        riffHeader: riff,
        waveHeader: wave,
        isValid: riff === 'RIFF' && wave === 'WAVE',
      });

      // Read actual format from WAV header
      const channels = view.getUint16(22, true);
      const sampleRateFromHeader = view.getUint32(24, true);
      const bitsPerSample = view.getUint16(34, true);

      log(context, 'WAV format from header', {
        channels,
        sampleRate: sampleRateFromHeader,
        bitsPerSample,
      });

      const pcmData = arrayBuffer.slice(WAV_HEADER_SIZE);

      // Create push stream with actual format from WAV header
      log(context, 'Creating push audio stream with format from WAV header');
      const pushStream = sdk.AudioInputStream.createPushStream(
        sdk.AudioStreamFormat.getWaveFormatPCM(sampleRateFromHeader, bitsPerSample, channels)
      );

      // Write audio data to stream (chunked to avoid overflow)
      const chunkSize = 4096;
      const uint8Array = new Uint8Array(pcmData);
      let totalChunks = 0;

      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        pushStream.write(chunk.buffer as ArrayBuffer);
        totalChunks++;
      }
      pushStream.close();

      log(context, 'Audio data written to push stream', { totalChunks, totalBytes: uint8Array.length });

      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

      // Create recognizer
      log(context, 'Creating speech recognizer');
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      // Perform recognition with timeout
      log(context, 'Starting recognition (30s timeout)');
      const recognitionStart = Date.now();

      const result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          log(context, 'ERROR: Recognition timeout (30s)');
          recognizer.close();
          reject(new Error('Recognition timeout after 30 seconds'));
        }, 30000);

        recognizer.recognizeOnceAsync(
          (result) => {
            clearTimeout(timeout);
            const duration = Date.now() - recognitionStart;
            log(context, 'Recognition callback received', {
              duration: `${duration}ms`,
              reason: result.reason,
            });
            recognizer.close();
            resolve(result);
          },
          (error: unknown) => {
            clearTimeout(timeout);
            log(context, 'ERROR: Recognition callback error', {
              error: typeof error === 'object' && error !== null ? String(error) : String(error),
            });
            recognizer.close();
            reject(error);
          }
        );
      });

      const totalDuration = Date.now() - requestStart;
      log(context, 'Recognition completed', {
        resultReason: result.reason,
        textLength: result.text?.length || 0,
        textPreview: result.text?.slice(0, 50) || '(empty)',
        totalDuration: `${totalDuration}ms`,
      });

      if (result.reason === sdk.ResultReason.RecognizedSpeech) {
        log(context, 'SUCCESS: Speech recognized', {
          text: result.text,
          duration: result.duration ? `${result.duration / 10000}ms` : 'N/A',
        });
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: result.text }),
        };
      } else if (result.reason === sdk.ResultReason.NoMatch) {
        const noMatchDetails = sdk.NoMatchDetails.fromResult(result);
        log(context, 'WARNING: No speech matched', {
          reason: noMatchDetails.reason,
        });
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: '' }),
        };
      } else if (result.reason === sdk.ResultReason.Canceled) {
        const cancellation = sdk.CancellationDetails.fromResult(result);
        log(context, 'ERROR: Recognition canceled', {
          reason: cancellation.reason,
          ErrorCode: cancellation.ErrorCode,
          errorDetails: cancellation.errorDetails,
        });
        return {
          status: 500,
          body: `Speech recognition canceled: ${cancellation.reason} - ${cancellation.errorDetails}`,
        };
      }

      log(context, 'ERROR: Unknown recognition result', { reason: result.reason });
      return { status: 500, body: 'Unknown recognition result' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const stack = err instanceof Error ? err.stack : undefined;
      log(context, 'ERROR: Exception during transcription', {
        message,
        stack,
        errorType: err instanceof Error ? err.name : typeof err,
      });
      return { status: 500, body: `Transcription error: ${message}` };
    }
  },
});
