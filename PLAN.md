# Plan: Audio Recording Storage and Replay Feature

## Overview
Add the ability to store original voice recordings with each memo segment and provide an audio player to replay them.

## Current State
- Memos are stored in `localStorage` as JSON with: `id`, `title`, `content` (transcribed text), `createdAt`, `duration`, `tags`, `segmentCount`
- `AudioRecorder` (src/lib/audio.ts) produces a WAV blob that is currently only used for transcription
- Once transcribed, the audio blob is discarded
- No audio playback capability exists

## Proposed Architecture

### 1. Data Model Changes (src/types.ts)
```typescript
export interface AudioSegment {
  id: string;           // Unique ID for this segment
  blobData: string;     // Base64-encoded audio blob
  duration: number;     // Duration in seconds
  createdAt: string;    // ISO timestamp
}

export interface Memo {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  duration: number;     // Total duration of all segments
  tags: string[];
  segmentCount?: number;
  audioSegments: AudioSegment[];  // NEW: Store all audio segments
}
```

### 2. Storage Layer (src/lib/storage.ts)
- **Save audio blobs as Base64** - localStorage has ~5MB limit per domain
- **Storage management**:
  - Estimate: 1 minute of 16kHz WAV ≈ 1MB
  - Need storage quota checking before saving
  - Implement cleanup strategies if quota exceeded
- **New functions**:
  - `addAudioSegment(memoId, audioBlob, duration)` - Add audio to memo
  - `removeAudioSegment(memoId, segmentId)` - Remove specific segment
  - `getStorageUsage()` - Report localStorage usage

### 3. Audio Player Component (NEW: src/components/AudioPlayer.tsx)
- HTML5 `<audio>` element with custom styling
- Play/pause toggle
- Progress bar with seek capability
- Time display (current / total)
- Playback speed control (1x, 1.25x, 1.5x, 2x)
- Download individual segment button

### 4. Memo View Integration (src/components/MemoView.tsx)
- Display audio player for each segment
- Show waveform visualization (optional, using Web Audio API)
- Allow playback of individual segments OR all segments concatenated
- Delete audio segment option

### 5. Storage Management UI (NEW: src/components/StorageManager.tsx)
- Display total localStorage usage
- List all memos with their audio sizes
- Bulk delete old recordings
- Export recordings as files

### 6. Enhanced Recording Flow (src/components/Recorder.tsx)
- After transcription completes, store the audio blob
- Handle quota exceeded errors gracefully
- Option to "discard audio" if user doesn't want to save it

## Implementation Steps

### Phase 1: Core Storage (MVP)
1. **Update types.ts** - Add `AudioSegment` interface
2. **Update storage.ts** - Add `audioSegments` array to Memo, implement Base64 encoding/decoding
3. **Update Recorder.tsx** - Save audio blob after successful transcription
4. **Create AudioPlayer.tsx** - Basic HTML5 audio player component
5. **Update MemoView.tsx** - Display audio player for each segment

### Phase 2: Enhanced Features
6. **Audio concatenation** - Option to play all segments as one continuous audio
7. **Storage management** - Display usage, implement cleanup
8. **Waveform visualization** - Using Canvas + Web Audio API
9. **Download/Export** - Allow downloading original audio files

### Phase 3: Optimization
10. **Compression** - Convert to compressed format (Opus/WebM) before storing
11. **IndexedDB migration** - For larger storage capacity (if needed)

## Technical Considerations

### localStorage Quota Management
- Most browsers: 5-10MB per origin
- Base64 encoding adds ~33% overhead
- Strategies:
  - Warn user before quota exceeded
  - Auto-delete oldest recordings
  - Optional: "don't save audio" toggle

### Audio Format
- Currently using WAV (16kHz, 16-bit, mono)
- Good quality but large file size
- Future: Consider Opus/WebM for 80%+ size reduction

### Browser Compatibility
- Base64 `atob`/`btoa` - universally supported
- HTML5 Audio API - universally supported
- Web Audio API for waveform - IE11+

### Privacy
- Audio stored locally only (no server upload)
- Clear disclaimer to users

## File Changes Summary

| File | Change | Type |
|------|--------|------|
| `src/types.ts` | Add `AudioSegment` interface | Modify |
| `src/lib/storage.ts` | Add audio segment storage functions | Modify |
| `src/lib/audio.ts` | Add compression option (optional) | Modify |
| `src/components/Recorder.tsx` | Save audio after transcription | Modify |
| `src/components/MemoView.tsx` | Display audio players | Modify |
| `src/components/AudioPlayer.tsx` | New component | Create |
| `src/components/StorageManager.tsx` | Storage usage UI (Phase 2) | Create |
| `src/index.css` | Audio player styles | Modify |
| `src/lib/compression.ts` | Audio compression utilities (Phase 3) | Create |

## Success Criteria
- [ ] Audio recordings are saved with memos
- [ ] Individual segments can be played back
- [ ] Storage quota is monitored and managed
- [ ] User can download original audio files
- [ ] Graceful degradation if storage quota exceeded
- [ ] No breaking changes to existing memos (migration path)
