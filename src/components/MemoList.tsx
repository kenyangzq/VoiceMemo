import type { Memo } from '../types';

interface Props {
  memos: Memo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MemoList({ memos, selectedId, onSelect }: Props) {
  if (memos.length === 0) {
    return <div className="memo-list-empty">No memos yet. Record one!</div>;
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <ul className="memo-list">
      {memos.map((memo) => (
        <li
          key={memo.id}
          className={`memo-item ${selectedId === memo.id ? 'selected' : ''}`}
          onClick={() => onSelect(memo.id)}
        >
          <div className="memo-item-title">{memo.title}</div>
          <div className="memo-item-meta">
            <span>{formatDate(memo.createdAt)}</span>
            <span>{formatDuration(memo.duration)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
