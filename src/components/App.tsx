import { useState, useCallback } from 'react';
import { Recorder } from './Recorder';
import { MemoList } from './MemoList';
import { MemoView } from './MemoView';
import { storage } from '../lib/storage';
import type { Memo } from '../types';

export function App() {
  const [memos, setMemos] = useState<Memo[]>(() => storage.getAll());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setMemos(storage.getAll());
  }, []);

  const selectedMemo = selectedId ? memos.find((m) => m.id === selectedId) : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>VoiceMemo</h1>
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
          />
        ) : (
          <>
            <Recorder onMemoSaved={refresh} />
            <MemoList memos={memos} selectedId={selectedId} onSelect={setSelectedId} />
          </>
        )}
      </main>
    </div>
  );
}
