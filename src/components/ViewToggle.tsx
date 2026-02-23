import type { ViewMode } from '../types';

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const MODES: { value: ViewMode; label: string; icon: string }[] = [
  { value: 'flat', label: 'List', icon: '≡' },
  { value: 'tag-folders', label: 'Tags', icon: '#' },
  { value: 'date-folders', label: 'Dates', icon: '📅' },
];

export function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="view-toggle">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          className={`view-toggle-btn ${value === mode.value ? 'active' : ''}`}
          onClick={() => onChange(mode.value)}
          title={`View by ${mode.label}`}
          aria-label={`View by ${mode.label}`}
        >
          <span className="view-toggle-icon">{mode.icon}</span>
          <span className="view-toggle-label">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
