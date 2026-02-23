import type { Language } from '../types';

export async function transcribe(audioBlob: Blob, language: Language = 'en-US'): Promise<string> {
  console.log('[API] Starting transcription request', {
    blobSize: audioBlob.size,
    blobType: audioBlob.type,
    language,
  });

  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('language', language);

  const startTime = Date.now();

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  const duration = Date.now() - startTime;
  console.log('[API] Response received', {
    status: res.status,
    statusText: res.statusText,
    duration: `${duration}ms`,
    headers: Object.fromEntries(res.headers.entries()),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[API] Transcription failed', {
      status: res.status,
      errorBody: err,
    });
    throw new Error(`Transcription failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  console.log('[API] Transcription successful', {
    textLength: data.text?.length || 0,
    textPreview: data.text?.slice(0, 50) || '(empty)',
  });

  return data.text;
}
