import type { Language } from '../types';

const LANGUAGE_KEY = 'voicememo-language';

const DEFAULT_LANGUAGE: Language = 'en-US';

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
};
