import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { storage } from '../lib/storage';
import type { Memo, Language } from '../types';

interface Props {
  memo: Memo;
  onDelete: () => void;
  onBack: () => void;
  onUpdate: () => void;
  onAppendRecording?: () => void;
  language?: Language;
}

export function MemoView({ memo, onDelete, onBack, onUpdate, onAppendRecording }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(memo.title);
  const [content, setContent] = useState(memo.content);
  const [tags, setTags] = useState(memo.tags.join(', '));
  const [tagInput, setTagInput] = useState('');

  const handleDelete = () => {
    if (confirm('Delete this memo?')) {
      storage.remove(memo.id);
      onDelete();
    }
  };

  const handleSave = () => {
    const updatedMemo: Memo = {
      ...memo,
      title: title.trim() || memo.title,
      content: content.trim() || memo.content,
      tags: tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0),
    };
    storage.update(updatedMemo);
    setEditing(false);
    onUpdate();
  };

  const handleCancel = () => {
    setTitle(memo.title);
    setContent(memo.content);
    setTags(memo.tags.join(', '));
    setEditing(false);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !memo.tags.includes(trimmed)) {
      const newTags = [...memo.tags, trimmed];
      setTags(newTags.join(', '));
      storage.update({ ...memo, tags: newTags });
      onUpdate();
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = memo.tags.filter((t) => t !== tagToRemove);
    setTags(newTags.join(', '));
    storage.update({ ...memo, tags: newTags });
    onUpdate();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString(undefined, { dateStyle: 'medium' }),
      time: d.toLocaleTimeString(undefined, { timeStyle: 'short' }),
    };
  };

  const dt = formatDateTime(memo.createdAt);

  return (
    <div className="memo-view">
      <div className="memo-view-header">
        {editing ? (
          <>
            <button className="form-btn form-btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button className="form-btn form-btn-save" onClick={handleSave}>
              Save
            </button>
          </>
        ) : (
          <>
            <button className="back-btn" onClick={onBack}>
              &larr; Back
            </button>
            <button className="edit-btn" onClick={() => setEditing(true)}>
              Edit
            </button>
            {onAppendRecording && (
              <button className="append-btn" onClick={onAppendRecording}>
                + Add Recording
              </button>
            )}
            <button className="delete-btn" onClick={handleDelete}>
              Delete
            </button>
          </>
        )}
      </div>

      <div className="memo-view-meta">
        <time>{formatDate(memo.createdAt)}</time>
        <span className="memo-view-date-time">
          {dt.date} at {dt.time}
        </span>
        {memo.segmentCount && memo.segmentCount > 1 && (
          <span className="memo-segments">{memo.segmentCount} recordings</span>
        )}
      </div>

      {/* Tags display */}
      {memo.tags.length > 0 && !editing && (
        <div className="memo-view-tags">
          {memo.tags.map((tag) => (
            <span key={tag} className="memo-tag">
              {tag}
              <button
                className="tag-remove"
                onClick={() => handleRemoveTag(tag)}
                title="Remove tag"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add tag (when not editing) */}
      {!editing && (
        <div className="memo-add-tag">
          <input
            type="text"
            className="tag-input"
            placeholder="Add tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
          />
          <button className="tag-add-btn" onClick={handleAddTag}>
            Add
          </button>
        </div>
      )}

      {editing ? (
        <div className="memo-edit-form">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Content (markdown)</label>
            <textarea
              className="form-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
            />
          </div>
          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              className="form-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="work, ideas, todo"
            />
          </div>
          <div className="form-actions">
            <button className="form-btn form-btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
            <button className="form-btn form-btn-save" onClick={handleSave}>
              Save
            </button>
          </div>

        </div>
      ) : (
        <div className="memo-view-content">
          <h2 className="memo-view-title">{memo.title}</h2>
          <ReactMarkdown>{memo.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
