import { useState, useCallback, useEffect } from 'react';
import { Recorder } from './Recorder';
import { MemoList } from './MemoList';
import { MemoView } from './MemoView';
import { LanguageSelector } from './LanguageSelector';
import { storage } from '../lib/storage';
import { settings } from '../lib/settings';
import { VERSION } from '../version';
import type { Memo, Language } from '../types';

export function App() {
  const [memos, setMemos] = useState<Memo[]>(() => storage.getAll());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [appendMemoId, setAppendMemoId] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [language, setLanguage] = useState<Language>(() => settings.getLanguage());

  const handleLanguageChange = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    settings.setLanguage(newLanguage);
  }, []);

  useEffect(() => {
    setAllTags(storage.getAllTags());
  }, [memos]);

  const refresh = useCallback(() => {
    setMemos(storage.getAll());
    setAllTags(storage.getAllTags());
  }, []);

  const selectedMemo = selectedId ? memos.find((m) => m.id === selectedId) : null;

  // When in append mode, show recorder for specific memo
  if (appendMemoId) {
    const appendMemo = memos.find((m) => m.id === appendMemoId);
    return (
      <div className="app">
        <header className="app-header">
          <h1>VoiceMemo</h1>
          <div className="header-controls">
            <LanguageSelector value={language} onChange={handleLanguageChange} />
            <span className="version">v{VERSION}</span>
          </div>
        </header>
        <main className="app-main">
          <div className="append-mode-header">
            <button className="back-btn" onClick={() => setAppendMemoId(null)}>
              &larr; Cancel
            </button>
            <span className="append-mode-title">
              Adding to: {appendMemo?.title || 'Untitled'}
            </span>
          </div>
          <Recorder
            onMemoSaved={() => {
              setAppendMemoId(null);
              refresh();
            }}
            language={language}
            memoId={appendMemoId}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>VoiceMemo</h1>
        <div className="header-controls">
          <LanguageSelector value={language} onChange={handleLanguageChange} />
          <span className="version">v{VERSION}</span>
        </div>
      </header>

      <main className="app-main">
        {selectedMemo ? (
          <MemoView
            memo={selectedMemo}
            onDelete={() => {
              setSelectedId(null);
              refresh();
            }}
            onBack={() => setSelectedId(null)}
            onUpdate={refresh}
            onAppendRecording={() => setAppendMemoId(selectedMemo.id)}
            language={language}
          />
        ) : (
          <>
            <Recorder onMemoSaved={refresh} language={language} />
            <MemoList
              memos={memos}
              selectedId={selectedId}
              onSelect={setSelectedId}
              allTags={allTags}
            />
          </>
        )}
      </main>
    </div>
  );
}
