import type { Memo } from '../types';

const STORAGE_KEY = 'voicememo_memos';

function getAll(): Memo[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Memo[];
}

function save(memo: Memo): void {
  const memos = getAll();
  memos.unshift(memo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

function get(id: string): Memo | undefined {
  return getAll().find((m) => m.id === id);
}

function remove(id: string): void {
  const memos = getAll().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

function update(updatedMemo: Memo): void {
  const memos = getAll();
  const index = memos.findIndex((m) => m.id === updatedMemo.id);
  if (index !== -1) {
    memos[index] = updatedMemo;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
  }
}

function getAllTags(): string[] {
  const tags = new Set<string>();
  getAll().forEach((m) => m.tags?.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}

export const storage = { getAll, save, get, remove, update, getAllTags };
