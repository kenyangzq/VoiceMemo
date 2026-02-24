export type Language = 'en-US' | 'zh-CN';

export type ViewMode = 'flat' | 'tag-folders' | 'date-folders';

export interface Memo {
  id: string;
  title: string;
  content: string; // markdown
  createdAt: string; // ISO 8601
  duration: number; // seconds
  tags: string[];
  segmentCount?: number; // number of recordings concatenated
}

export interface ObsidianSettings {
  enabled: boolean;
  folderPath: string;
  syncOnSave: boolean;
}
