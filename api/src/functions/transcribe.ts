import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

app.http('transcribe', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'transcribe',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION || 'eastus2';

    if (!speechKey || speechKey === 'your-azure-speech-key-here') {
      return { status: 500, body: 'AZURE_SPEECH_KEY not configured' };
    }

    try {
      const formData = await request.formData();
      const audioFile = formData.get('audio');

      if (!audioFile || !(audioFile instanceof Blob)) {
        return { status: 400, body: 'No audio file provided' };
      }

      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioFile.arrayBuffer();

      // Create push stream for Azure Speech SDK
      const pushStream = sdk.AudioInputStream.createPushStream(
        sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
      );

      // Write audio data to stream (chunked to avoid overflow)
      const chunkSize = 4096;
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        pushStream.write(chunk.buffer as ArrayBuffer);
      }
      pushStream.close();

      // Configure speech recognition
      const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
      speechConfig.speechRecognitionLanguage = 'en-US';

      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

      // Create recognizer
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      // Perform recognition with timeout
      const result = await new Promise<sdk.SpeechRecognitionResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          recognizer.close();
          reject(new Error('Recognition timeout'));
        }, 30000); // 30 second timeout

        recognizer.recognizeOnceAsync(
          (result) => {
            clearTimeout(timeout);
            recognizer.close();
            resolve(result);
          },
          (error) => {
            clearTimeout(timeout);
            recognizer.close();
            reject(error);
          }
        );
      });

      if (result.reason === sdk.ResultReason.RecognizedSpeech) {
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: result.text }),
        };
      } else if (result.reason === sdk.ResultReason.NoMatch) {
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: '' }),
        };
      } else if (result.reason === sdk.ResultReason.Canceled) {
        const cancellation = sdk.CancellationDetails.fromResult(result);
        return {
          status: 500,
          body: `Speech recognition canceled: ${cancellation.reason} - ${cancellation.errorDetails}`,
        };
      }

      return { status: 500, body: 'Unknown recognition result' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { status: 500, body: `Transcription error: ${message}` };
    }
  },
});
