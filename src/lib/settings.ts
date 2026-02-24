import type { Language, ViewMode, ObsidianSettings } from '../types';

const LANGUAGE_KEY = 'voicememo-language';
const VIEW_MODE_KEY = 'voicememo-view-mode';
const OBSIDIAN_SETTINGS_KEY = 'voicememo-obsidian-settings';

const DEFAULT_LANGUAGE: Language = 'en-US';
const DEFAULT_VIEW_MODE: ViewMode = 'flat';
const DEFAULT_OBSIDIAN_SETTINGS: ObsidianSettings = {
  enabled: false,
  folderPath: 'VoiceMemos',
  syncOnSave: true,
  organization: 'flat',
};

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

  getObsidianSettings(): ObsidianSettings {
    const stored = localStorage.getItem(OBSIDIAN_SETTINGS_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_OBSIDIAN_SETTINGS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_OBSIDIAN_SETTINGS;
      }
    }
    return DEFAULT_OBSIDIAN_SETTINGS;
  },

  setObsidianSettings(settings: ObsidianSettings): void {
    localStorage.setItem(OBSIDIAN_SETTINGS_KEY, JSON.stringify(settings));
  },
};
