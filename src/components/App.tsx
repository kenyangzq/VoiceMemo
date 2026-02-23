import { useState, useCallback, useEffect } from 'react';
import { Recorder } from './Recorder';
import { MemoList } from './MemoList';
import { MemoView } from './MemoView';
import { storage } from '../lib/storage';
import { VERSION } from '../version';
import type { Memo } from '../types';

export function App() {
  const [memos, setMemos] = useState<Memo[]>(() => storage.getAll());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    setAllTags(storage.getAllTags());
  }, [memos]);

  const refresh = useCallback(() => {
    setMemos(storage.getAll());
    setAllTags(storage.getAllTags());
  }, []);

  const selectedMemo = selectedId ? memos.find((m) => m.id === selectedId) : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>VoiceMemo</h1>
        <span className="version">v{VERSION}</span>
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
          />
        ) : (
          <>
            <Recorder onMemoSaved={refresh} />
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
