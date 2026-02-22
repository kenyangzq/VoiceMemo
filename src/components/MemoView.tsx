import ReactMarkdown from 'react-markdown';
import { storage } from '../lib/storage';
import type { Memo } from '../types';

interface Props {
  memo: Memo;
  onDelete: () => void;
  onBack: () => void;
}

export function MemoView({ memo, onDelete, onBack }: Props) {
  const handleDelete = () => {
    if (confirm('Delete this memo?')) {
      storage.remove(memo.id);
      onDelete();
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  return (
    <div className="memo-view">
      <div className="memo-view-header">
        <button className="back-btn" onClick={onBack}>
          &larr; Back
        </button>
        <button className="delete-btn" onClick={handleDelete}>
          Delete
        </button>
      </div>
      <div className="memo-view-meta">
        <time>{formatDate(memo.createdAt)}</time>
      </div>
      <div className="memo-view-content">
        <ReactMarkdown>{memo.content}</ReactMarkdown>
      </div>
    </div>
  );
}
