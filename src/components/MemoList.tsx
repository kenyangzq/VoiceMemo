import { useState, useMemo, useCallback } from 'react';
import type { Memo, ViewMode } from '../types';

interface Props {
  memos: Memo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  allTags: string[];
  viewMode: ViewMode;
}

interface Folder {
  name: string;
  count: number;
  memos: Memo[];
  expanded: boolean;
}

export function MemoList({ memos, selectedId, onSelect, allTags, viewMode }: Props) {
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const filteredMemos = memos.filter((m) => {
    const matchesTag = !filterTag || m.tags.includes(filterTag);
    const matchesSearch =
      !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  // Group memos into folders based on view mode
  const folders = useMemo(() => {
    if (viewMode === 'flat') {
      return [];
    }

    const folderMap = new Map<string, Memo[]>();

    if (viewMode === 'tag-folders') {
      // Group by tags - a memo can be in multiple tag folders
      for (const memo of filteredMemos) {
        if (memo.tags.length === 0) {
          const untitled = folderMap.get('Untagged') ?? [];
          untitled.push(memo);
          folderMap.set('Untagged', untitled);
        } else {
          for (const tag of memo.tags) {
            const tagged = folderMap.get(tag) ?? [];
            tagged.push(memo);
            folderMap.set(tag, tagged);
          }
        }
      }
    } else if (viewMode === 'date-folders') {
      // Group by date periods
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const thisWeek = new Date(today);
      thisWeek.setDate(thisWeek.getDate() - 7);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      for (const memo of filteredMemos) {
        const memoDate = new Date(memo.createdAt);
        let folderName = '';

        if (memoDate >= today) {
          folderName = 'Today';
        } else if (memoDate >= yesterday) {
          folderName = 'Yesterday';
        } else if (memoDate >= thisWeek) {
          folderName = 'This Week';
        } else if (memoDate >= thisMonth) {
          folderName = 'This Month';
        } else {
          // Older - group by year and month
          folderName = memoDate.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
          });
        }

        const dated = folderMap.get(folderName) ?? [];
        dated.push(memo);
        folderMap.set(folderName, dated);
      }
    }

    // Convert to array and sort
    return Array.from(folderMap.entries())
      .map(([name, memos]) => ({
        name,
        count: memos.length,
        memos,
        expanded: expandedFolders.has(name),
      }))
      .sort((a, b) => {
        // Special sorting for date folders
        if (viewMode === 'date-folders') {
          const order = ['Today', 'Yesterday', 'This Week', 'This Month'];
          const aIndex = order.indexOf(a.name);
          const bIndex = order.indexOf(b.name);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          // For older dates, sort descending (newest first)
          return b.name.localeCompare(a.name);
        }
        // For tags, sort alphabetically
        return a.name.localeCompare(b.name);
      });
  }, [filteredMemos, viewMode, expandedFolders]);

  // Get all folder names for expand/collapse all
  const folderNames = useMemo(() => folders.map((f) => f.name), [folders]);

  // Toggle folder expansion
  const toggleFolder = useCallback((folderName: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  }, []);

  // Expand all folders
  const expandAll = useCallback(() => {
    setExpandedFolders(new Set(folderNames));
  }, [folderNames]);

  // Collapse all folders
  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set());
  }, []);

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

  const renderMemoItem = (memo: Memo) => (
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
  );

  const renderFolder = (folder: Folder) => (
    <div key={folder.name} className="folder">
      <button
        className="folder-header"
        onClick={() => toggleFolder(folder.name)}
      >
        <span className={`folder-icon ${folder.expanded ? 'expanded' : ''}`}>
          ▶
        </span>
        <span className="folder-name">{folder.name}</span>
        <span className="folder-count">{folder.count}</span>
      </button>
      {folder.expanded && (
        <ul className="memo-list memo-list-nested">
          {folder.memos.map((memo) => renderMemoItem(memo))}
        </ul>
      )}
    </div>
  );

  const hasFolders = viewMode !== 'flat' && folders.length > 0;

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
      ) : hasFolders ? (
        <div className="folder-view">
          <div className="folder-controls">
            <button className="folder-control-btn" onClick={expandAll}>
              Expand All
            </button>
            <button className="folder-control-btn" onClick={collapseAll}>
              Collapse All
            </button>
          </div>
          <div className="folders">
            {folders.map((folder) => renderFolder(folder))}
          </div>
        </div>
      ) : (
        <ul className="memo-list">
          {filteredMemos.map((memo) => renderMemoItem(memo))}
        </ul>
      )}
    </>
  );
}
