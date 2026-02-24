import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioRecorder } from '../lib/audio';
import { transcribe, generateTitle } from '../lib/api';
import { storage } from '../lib/storage';
import type { Memo, Language } from '../types';

interface Props {
  onMemoSaved: () => void;
  language: Language;
  memoId?: string; // If provided, append to existing memo instead of creating new
}

export function Recorder({ onMemoSaved, language, memoId }: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      if (!recorderRef.current) {
        recorderRef.current = new AudioRecorder();
      }
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
      if (!recorderRef.current) {
        throw new Error('Recorder not initialized');
      }
      const { blob, duration } = await recorderRef.current.stop();

      // Log audio details for debugging
      console.log('[Recorder] Audio blob details:', {
        size: blob.size,
        type: blob.type,
        duration,
        isEmpty: blob.size === 0,
      });

      // Validate audio blob before sending
      if (blob.size === 0) {
        throw new Error('Recording produced empty audio file. Please try again.');
      }

      // Minimum duration check (0.5 seconds) to avoid accidental clicks
      if (duration < 0.5) {
        throw new Error('Recording too short. Please record for at least 0.5 seconds.');
      }

      // Maximum file size check (25MB is Azure Speech limit)
      const MAX_SIZE = 25 * 1024 * 1024;
      if (blob.size > MAX_SIZE) {
        throw new Error('Recording too large. Please keep recordings under 25MB.');
      }

      console.log('[Recorder] Starting transcription...');
      const text = await transcribe(blob, language);
      console.log('[Recorder] Transcription result:', {
        textLength: text.length,
        textPreview: text.slice(0, 100),
      });

      if (!text || text.trim().length === 0) {
        throw new Error('No speech was detected in the recording. Please try speaking more clearly.');
      }

      if (memoId) {
        // Append to existing memo
        const updated = storage.append(memoId, text, duration);
        if (!updated) {
          throw new Error('Memo not found');
        }
      } else {
        // Create new memo
        const memo: Memo = {
          id: crypto.randomUUID(),
          title: text.slice(0, 60) + (text.length > 60 ? '...' : ''),
          content: text,
          createdAt: new Date().toISOString(),
          duration,
          tags: storage.getLatestTags(),
          segmentCount: 1,
        };
        storage.save(memo);

        // Fire-and-forget: generate AI title in background
        generateTitle(text, language)
          .then((title) => {
            const saved = storage.get(memo.id);
            if (saved) {
              storage.update({ ...saved, title });
              onMemoSaved();
            }
          })
          .catch((err) => {
            console.warn('[Recorder] Title generation failed, keeping fallback title:', err);
          });
      }
      onMemoSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      setError(msg);
      console.error('[Recorder] Error details:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        name: err instanceof Error ? err.name : undefined,
      });
    } finally {
      setProcessing(false);
    }
  }, [onMemoSaved, language, memoId]);

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
