import { useState } from 'react';
import type { Memo } from '../types';

interface Props {
  memos: Memo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  allTags: string[];
}

export function MemoList({ memos, selectedId, onSelect, allTags }: Props) {
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const filteredMemos = filterTag
    ? memos.filter((m) => m.tags.includes(filterTag))
    : memos;

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
    <>
      {allTags.length > 0 && (
        <div className="tag-filter">
          <button
            className={`tag-filter-btn ${filterTag === null ? 'active' : ''}`}
            onClick={() => setFilterTag(null)}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag-filter-btn ${filterTag === tag ? 'active' : ''}`}
              onClick={() => setFilterTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      {filteredMemos.length === 0 ? (
        <div className="memo-list-empty">
          {filterTag ? `No memos tagged "${filterTag}"` : 'No memos yet. Record one!'}
        </div>
      ) : (
        <ul className="memo-list">
          {filteredMemos.map((memo) => (
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
              {memo.tags.length > 0 && (
                <div className="memo-item-tags">
                  {memo.tags.map((tag) => (
                    <span key={tag} className="memo-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
