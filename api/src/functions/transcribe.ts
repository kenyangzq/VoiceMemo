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
        const end = Math.min(i + chunkSize, uint8Array.length);
        const chunk = uint8Array.slice(i, end);
        pushStream.write(chunk.buffer as ArrayBuffer);
        totalChunks++;
      }
      pushStream.close();

      log(context, 'Audio data written to push stream', { totalChunks, totalBytes: uint8Array.length });

      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

      // Create recognizer
      log(context, 'Creating speech recognizer');
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      // Use continuous recognition to support long audio (>15s)
      // Estimate timeout based on audio duration: audio bytes / (sampleRate * bytesPerSample * channels) = seconds
      const audioDurationSec = uint8Array.length / (sampleRateFromHeader * (bitsPerSample / 8) * channels);
      const timeoutMs = Math.max(60000, (audioDurationSec + 30) * 1000); // at least 60s, or audio duration + 30s buffer

      log(context, 'Starting continuous recognition', {
        estimatedAudioDuration: `${audioDurationSec.toFixed(1)}s`,
        timeout: `${(timeoutMs / 1000).toFixed(0)}s`,
      });

      const recognitionStart = Date.now();

      const result = await new Promise<{ text: string; error?: string }>((resolve, reject) => {
        const segments: string[] = [];
        let lastError: string | undefined;

        const timeout = setTimeout(() => {
          log(context, 'ERROR: Recognition timeout');
          recognizer.stopContinuousRecognitionAsync(() => {
            recognizer.close();
            if (segments.length > 0) {
              resolve({ text: segments.join(' ') });
            } else {
              reject(new Error(`Recognition timeout after ${(timeoutMs / 1000).toFixed(0)} seconds`));
            }
          });
        }, timeoutMs);

        recognizer.recognized = (_sender, e) => {
          if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
            log(context, 'Segment recognized', {
              segmentIndex: segments.length,
              text: e.result.text,
            });
            segments.push(e.result.text);
          } else if (e.result.reason === sdk.ResultReason.NoMatch) {
            log(context, 'Segment: no match');
          }
        };

        recognizer.canceled = (_sender, e) => {
          clearTimeout(timeout);
          if (e.reason === sdk.CancellationReason.EndOfStream) {
            // Normal completion - all audio processed
            log(context, 'Recognition completed (end of stream)', { segmentCount: segments.length });
            recognizer.stopContinuousRecognitionAsync(() => {
              recognizer.close();
              resolve({ text: segments.join(' ') });
            });
          } else if (e.reason === sdk.CancellationReason.Error) {
            log(context, 'ERROR: Recognition canceled with error', {
              errorCode: e.errorCode,
              errorDetails: e.errorDetails,
            });
            recognizer.stopContinuousRecognitionAsync(() => {
              recognizer.close();
              if (segments.length > 0) {
                // Return partial results if we have any
                resolve({ text: segments.join(' '), error: e.errorDetails });
              } else {
                reject(new Error(`Speech recognition error: ${e.errorDetails}`));
              }
            });
          }
        };

        recognizer.sessionStopped = () => {
          clearTimeout(timeout);
          log(context, 'Session stopped', { segmentCount: segments.length });
          recognizer.close();
          resolve({ text: segments.join(' ') });
        };

        recognizer.startContinuousRecognitionAsync(
          () => {
            log(context, 'Continuous recognition started');
          },
          (error: unknown) => {
            clearTimeout(timeout);
            log(context, 'ERROR: Failed to start continuous recognition', {
              error: String(error),
            });
            recognizer.close();
            reject(error);
          }
        );
      });

      const totalDuration = Date.now() - requestStart;
      log(context, 'Recognition completed', {
        textLength: result.text?.length || 0,
        textPreview: result.text?.slice(0, 100) || '(empty)',
        totalDuration: `${totalDuration}ms`,
        hasPartialError: !!result.error,
      });

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: result.text }),
      };
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
