import { app, HttpRequest, HttpResponseInit } from '@azure/functions';

app.http('transcribe', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'transcribe',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      return { status: 500, body: 'OPENAI_API_KEY not configured' };
    }

    try {
      const formData = await request.formData();
      const audioFile = formData.get('audio');

      if (!audioFile || !(audioFile instanceof Blob)) {
        return { status: 400, body: 'No audio file provided' };
      }

      // Forward to OpenAI Whisper API
      const whisperForm = new FormData();
      whisperForm.append('file', audioFile, 'recording.webm');
      whisperForm.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: whisperForm,
      });

      if (!response.ok) {
        const errText = await response.text();
        return { status: response.status, body: `Whisper API error: ${errText}` };
      }

      const result = (await response.json()) as { text: string };

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: result.text }),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { status: 500, body: `Transcription error: ${message}` };
    }
  },
});
