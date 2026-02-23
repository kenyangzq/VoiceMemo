export type Language = 'en-US' | 'zh-CN';

export interface Memo {
  id: string;
  title: string;
  content: string; // markdown
  createdAt: string; // ISO 8601
  duration: number; // seconds
  tags: string[];
  segmentCount?: number; // number of recordings concatenated
}
