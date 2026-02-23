import type { Language } from '../types';

interface Props {
  value: Language;
  onChange: (language: Language) => void;
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en-US', label: 'English' },
  { value: 'zh-CN', label: '中文' },
];

export function LanguageSelector({ value, onChange }: Props) {
  return (
    <select
      className="language-selector"
      value={value}
      onChange={(e) => onChange(e.target.value as Language)}
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.value} value={lang.value}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
