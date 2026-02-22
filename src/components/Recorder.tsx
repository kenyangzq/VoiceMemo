import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioRecorder } from '../lib/audio';
import { transcribe } from '../lib/api';
import { storage } from '../lib/storage';
import type { Memo } from '../types';

interface Props {
  onMemoSaved: () => void;
}

export function Recorder({ onMemoSaved }: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef(new AudioRecorder());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      await recorderRef.current.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access.');
      console.error(err);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setProcessing(true);
    setError(null);

    try {
      const { blob, duration } = await recorderRef.current.stop();
      const text = await transcribe(blob);

      const memo: Memo = {
        id: crypto.randomUUID(),
        title: text.slice(0, 60) + (text.length > 60 ? '...' : ''),
        content: text,
        createdAt: new Date().toISOString(),
        duration,
      };

      storage.save(memo);
      onMemoSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      setError(msg);
      console.error(err);
    } finally {
      setProcessing(false);
    }
  }, [onMemoSaved]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="recorder">
      {error && <div className="recorder-error">{error}</div>}

      {processing ? (
        <div className="recorder-processing">
          <div className="spinner" />
          <span>Transcribing...</span>
        </div>
      ) : (
        <>
          <button
            className={`record-btn ${recording ? 'recording' : ''}`}
            onClick={recording ? stopRecording : startRecording}
          >
            <span className="record-icon" />
          </button>
          <span className="recorder-label">
            {recording ? formatTime(elapsed) : 'Tap to record'}
          </span>
        </>
      )}
    </div>
  );
}
