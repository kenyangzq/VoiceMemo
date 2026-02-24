import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

function log(context: InvocationContext, message: string, data?: Record<string, unknown>) {
  const logData = data ? JSON.stringify(data) : '';
  context.log(`[GenerateTitle] ${message} ${logData}`);
}

app.http('generateTitle', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'generate-title',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      log(context, 'ERROR: GEMINI_API_KEY not configured');
      return { status: 500, body: 'GEMINI_API_KEY not configured' };
    }

    try {
      const body = await request.json() as { text: string; language?: string };
      const { text, language } = body;

      if (!text || text.trim().length === 0) {
        return { status: 400, body: 'No text provided' };
      }

      const langInstruction = language === 'zh-CN'
        ? 'Reply in Chinese.'
        : 'Reply in English.';

      const prompt = `Generate a concise title (max 50 characters) for this voice memo transcription. Return ONLY the title, no quotes, no explanation. ${langInstruction}\n\nTranscription:\n${text.slice(0, 1000)}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        log(context, 'Gemini API error', { status: response.status, body: errText });
        return { status: 502, body: 'Title generation failed' };
      }

      const data = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const title = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!title) {
        log(context, 'Empty title from Gemini');
        return { status: 502, body: 'Empty title generated' };
      }

      const finalTitle = title.length > 60 ? title.slice(0, 57) + '...' : title;

      log(context, 'Title generated', { title: finalTitle });

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: finalTitle }),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log(context, 'ERROR', { message });
      return { status: 500, body: `Title generation error: ${message}` };
    }
  },
});
