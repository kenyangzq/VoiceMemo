import type { Language, ViewMode } from '../types';

const LANGUAGE_KEY = 'voicememo-language';
const VIEW_MODE_KEY = 'voicememo-view-mode';

const DEFAULT_LANGUAGE: Language = 'en-US';
const DEFAULT_VIEW_MODE: ViewMode = 'flat';

export const settings = {
  getLanguage(): Language {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored === 'en-US' || stored === 'zh-CN') {
      return stored;
    }
    return DEFAULT_LANGUAGE;
  },

  setLanguage(language: Language): void {
    localStorage.setItem(LANGUAGE_KEY, language);
  },

  getViewMode(): ViewMode {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === 'flat' || stored === 'tag-folders' || stored === 'date-folders') {
      return stored;
    }
    return DEFAULT_VIEW_MODE;
  },

  setViewMode(mode: ViewMode): void {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  },
};
