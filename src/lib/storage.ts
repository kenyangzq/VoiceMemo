import type { Memo } from '../types';
import { settings } from './settings';
import { writeMemoToDrive, generateObsidianMarkdown, generateMemoFilename } from './api';

const STORAGE_KEY = 'voicememo_memos';

// Sync a memo to Google Drive (Obsidian)
async function syncMemoToDrive(memo: Memo): Promise<boolean> {
  const obsidianSettings = settings.getObsidianSettings();

  if (!obsidianSettings.enabled || !obsidianSettings.syncOnSave) {
    return false;
  }

  try {
    const markdown = generateObsidianMarkdown(memo);
    const filename = generateMemoFilename(memo);

    await writeMemoToDrive({
      filename,
      content: markdown,
      folderPath: obsidianSettings.folderPath || undefined,
    });

    console.log('[Storage] Memo synced to Drive', { memoId: memo.id, filename });
    return true;
  } catch (err) {
    console.error('[Storage] Failed to sync memo to Drive', { error: err });
    // Don't throw - sync failures shouldn't block local save
    return false;
  }
}

function getAll(): Memo[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Memo[];
}

async function save(memo: Memo): Promise<void> {
  const memos = getAll();
  memos.unshift(memo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));

  // Sync to Drive if enabled
  await syncMemoToDrive(memo);
}

function get(id: string): Memo | undefined {
  return getAll().find((m) => m.id === id);
}

function remove(id: string): void {
  const memos = getAll().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

async function update(updatedMemo: Memo): Promise<void> {
  const memos = getAll();
  const index = memos.findIndex((m) => m.id === updatedMemo.id);
  if (index !== -1) {
    memos[index] = updatedMemo;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));

    // Sync to Drive if enabled
    await syncMemoToDrive(updatedMemo);
  }
}

function getAllTags(): string[] {
  const tags = new Set<string>();
  getAll().forEach((m) => m.tags?.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}

async function append(id: string, additionalContent: string, additionalDuration: number): Promise<Memo | undefined> {
  const memos = getAll();
  const index = memos.findIndex((m) => m.id === id);
  if (index === -1) return undefined;

  const existing = memos[index];
  const separator = existing.content.endsWith('\n') ? '\n\n' : '\n\n';
  const updated: Memo = {
    ...existing,
    content: existing.content + separator + additionalContent,
    duration: existing.duration + additionalDuration,
    segmentCount: (existing.segmentCount || 1) + 1,
  };

  memos[index] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));

  // Sync to Drive if enabled
  await syncMemoToDrive(updated);

  return updated;
}

function getLatestTags(): string[] {
  const memos = getAll();
  if (memos.length === 0) return [];
  return memos[0].tags || [];
}

export const storage = { getAll, save, get, remove, update, getAllTags, getLatestTags, append, syncMemoToDrive };
