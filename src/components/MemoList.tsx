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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMemos = memos.filter((m) => {
    const matchesTag = !filterTag || m.tags.includes(filterTag);
    const matchesSearch =
      !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

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
      <div className="search-container">
        <input
          type="text"
          placeholder="Search memos..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
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
          {searchQuery
            ? `No memos match "${searchQuery}"`
            : filterTag
              ? `No memos tagged "${filterTag}"`
              : 'No memos yet. Record one!'}
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
