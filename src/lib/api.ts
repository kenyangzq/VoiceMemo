import type { Language, FolderOrganization, Memo } from '../types';
import { VERSION } from '../version';

export async function transcribe(audioBlob: Blob, language: Language = 'en-US'): Promise<string> {
  console.log('[API] Starting transcription request', {
    blobSize: audioBlob.size,
    blobType: audioBlob.type,
    language,
  });

  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');
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

export async function generateTitle(text: string, language: Language = 'en-US'): Promise<string> {
  const res = await fetch('/api/generate-title', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  });

  if (!res.ok) {
    throw new Error(`Title generation failed (${res.status})`);
  }

  const data = await res.json() as { title: string };
  return data.title;
}

// Google Drive OAuth API
export async function getGoogleDriveAuthUrl(): Promise<{ authUrl: string; state: string }> {
  const res = await fetch('/api/google-drive/auth');
  if (!res.ok) {
    throw new Error('Failed to get authorization URL');
  }
  return res.json();
}

export async function checkGoogleDriveConnection(): Promise<{ connected: boolean }> {
  const res = await fetch('/api/google-drive/status');
  if (!res.ok) {
    return { connected: false };
  }
  return res.json();
}

// Write memo to Google Drive (Obsidian sync)
export async function writeMemoToDrive(params: {
  filename: string;
  content: string;
  folderPath?: string;
}): Promise<{ success: boolean; fileId: string; message: string }> {
  console.log('[API] Writing memo to Drive', { filename: params.filename });

  const res = await fetch('/api/google-drive/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json() as { error: string };
    console.error('[API] Drive write failed', { error: err.error });
    throw new Error(err.error || 'Failed to write to Google Drive');
  }

  const data = await res.json() as { success: boolean; fileId: string; message: string };
  console.log('[API] Drive write successful', { fileId: data.fileId });
  return data;
}

// Get subfolder path based on organization mode
export function getMemoSubfolder(memo: Memo, organization: FolderOrganization): string {
  const date = new Date(memo.createdAt);

  switch (organization) {
    case 'year-month':
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}/${month}`;

    case 'date':
      return date.toISOString().split('T')[0]; // YYYY-MM-DD

    case 'tag':
      // Use first tag, or 'Untagged' if none
      return memo.tags?.[0] || 'Untagged';

    case 'flat':
    default:
      return '';
  }
}

// Generate Obsidian-compatible markdown from memo
export function generateObsidianMarkdown(memo: {
  title: string;
  content: string;
  createdAt: string;
  duration: number;
  tags: string[];
  segmentCount?: number;
  id: string;
}): string {
  const createdDate = new Date(memo.createdAt);
  const yamlDate = createdDate.toISOString();

  const tags = memo.tags.length > 0
    ? memo.tags.map((t) => `  - ${t}`).join('\n')
    : '';

  const frontmatter = `---
type: voice-memo
created: ${yamlDate}
duration_seconds: ${memo.duration}
${memo.tags.length > 0 ? `tags:\n${tags}\n` : ''}segments: ${memo.segmentCount || 1}
voice_id: "${memo.id}"
app: VoiceMemo
app_version: "${VERSION}"
---

# ${memo.title}

`;

  return frontmatter + memo.content;
}

// Generate filename for memo
export function generateMemoFilename(memo: { title: string; createdAt: string }): string {
  const createdDate = new Date(memo.createdAt);
  const datePart = createdDate.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = createdDate.toTimeString().slice(0, 5).replace(':', '');

  // Sanitize title for filename
  const sanitizedTitle = memo.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);

  return `${datePart}-${timePart}-${sanitizedTitle}.md`;
}
