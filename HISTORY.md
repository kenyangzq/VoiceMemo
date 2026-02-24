# Changelog

## 2026-02-24: Add floating record button for quick access and in-memo appending
- Added floating record button (fixed bottom-right) on list view for quick new memo creation
- Added floating record button in MemoView for appending recordings to existing memos
- New full-screen recording modal overlay with pulsing indicator and stop button
- Recorder component now supports both inline and floating modes via `floating` prop
- Mobile-optimized: larger touch targets (72px) on small screens
- Enhanced error validation: minimum duration, max file size, empty audio detection
- Updated `App.tsx` to render Recorder as floating button on list view
- Updated `MemoView.tsx` with inline recording capability (no need for separate append mode)
- Updated `Recorder.tsx` with floating prop and conditional rendering
- Updated `src/index.css` with floating button styles, recording modal, and animations
- Version bumped to 1.7.0

## 2026-02-24: Smart tag suggestions and auto-inherit tags
- MemoView now shows existing tags as clickable suggestions below the "Add tag" input, filtered to exclude tags already on the memo
- New memos automatically inherit tags from the most recent memo (no more starting from scratch)
- Added `getLatestTags()` to storage module
- Passed `allTags` from App to MemoView for suggestion display
- Added dashed-border tag suggestion chips with hover accent styling

## 2026-02-24: Add AI-generated memo titles with Gemini Flash
- New Azure Function `api/src/functions/generateTitle.ts` — calls Google Gemini Flash 2.0 (free tier) to generate concise titles from transcription content
- Uses raw `fetch` to Gemini REST API (no SDK dependency added)
- Title generation is fire-and-forget: memo saves instantly with fallback title (first 60 chars), then updates when AI title arrives
- Only triggers on new memo creation, not when appending to existing memos
- Language-aware: generates Chinese titles for Chinese memos
- Graceful fallback: if Gemini fails, the fallback title is silently kept
- Added `generateTitle()` to frontend API client (`src/lib/api.ts`)
- Updated `Recorder.tsx` to call title generation after new memo creation
- Added `GEMINI_API_KEY` to `api/local.settings.json` and `infra/main.bicep`
- Version bumped to 1.5.0

## 2026-02-23: Fix mobile memo view header layout
- Changed `.memo-view-header` from `justify-content: space-between` to flexbox with `gap` and `flex-wrap`
- Buttons now wrap gracefully on narrow mobile screens instead of getting cramped
- Added mobile-specific button padding adjustments for better touch targets
- Adjusted share menu positioning for mobile viewport
- Version bumped to 1.4.1

## 2026-02-23: Add Apple Notes integration (Share to Notes)
- Added Share button in MemoView header with dropdown menu for multiple export options
- **Web Share API**: On iOS Safari and Android, opens native share sheet to select Notes app
- **Copy to Clipboard**: Universal fallback with visual "Copied!" feedback after copying
- **Apple Shortcuts**: iOS-only option that triggers custom shortcuts via URL scheme (`shortcuts://run-shortcut`)
- Share text strips markdown formatting for clean plain text in Notes
- Platform detection (iOS vs desktop) shows/hides relevant options
- Updated `src/components/MemoView.tsx` with share handlers and menu UI
- Updated `src/index.css` with `.share-container`, `.share-btn`, `.share-menu` styles
- Version bumped to 1.4.0

## 2026-02-23: Fix transcription repeating words multiple times
- Fixed critical bug in `api/src/functions/transcribe.ts` where `Uint8Array.subarray().buffer` returned the entire underlying ArrayBuffer instead of just the chunk
- Each chunk write to the push stream was sending the full audio data, causing Azure Speech to process and transcribe the audio N times
- Changed `subarray()` to `slice()` which creates a new ArrayBuffer containing only the chunk data
- Version bumped to 1.3.1

## 2026-02-23: Support long audio transcription (>15 seconds)
- Replaced `recognizeOnceAsync` with `startContinuousRecognitionAsync` in `api/src/functions/transcribe.ts`
- Previous implementation only recognized a single phrase (~15s max), silently dropping the rest
- Continuous recognition collects all speech segments and joins them into full text
- Dynamic timeout based on audio duration (audio length + 30s buffer, minimum 60s)
- Graceful handling: returns partial results if an error occurs mid-recognition
- Updated `src/lib/audio.ts` MediaRecorder to use 1-second timeslice for reliable long recording data collection
- Version bumped to 1.3.0

## 2026-02-23: Fix memo edit UX and append transcription bug
- Added Cancel/Save buttons to memo view header when editing, so they're always visible without scrolling
- Fixed stale closure bug in Recorder: `stopRecording` now includes `language` and `memoId` in dependency array, fixing broken append-to-existing-memo transcription
- Kept bottom form Cancel/Save buttons as well for convenience

## 2026-02-23: Fix mobile header layout overflow
- Restructured `.app-header` from centered single-row to space-between layout (title left, controls right)
- Added `flex-wrap` on `.header-controls` so controls wrap gracefully on narrow screens
- Added responsive breakpoint at 480px: hides view toggle labels, reduces font sizes and padding
- Reduced h1 font size slightly for better mobile fit

## 2026-02-23: Add folder structure for memo organization
- Added `ViewMode` type (`'flat' | 'tag-folders' | 'date-folders'`) to `src/types.ts`
- Updated `src/lib/settings.ts` — localStorage persistence for view mode preference
- Created `src/components/ViewToggle.tsx` — toggle button in header for switching view modes
- Rewrote `src/components/MemoList.tsx` — now supports hierarchical folder views:
  - **Flat view** (default): simple chronological list
  - **Tag folders**: memos grouped by tags, with "Untagged" for items without tags
  - **Date folders**: memos grouped by Today, Yesterday, This Week, This Month, and older by month
- Added expand/collapse functionality for folders with Expand All/Collapse All controls
- Updated `src/components/App.tsx` — integrates ViewToggle in header and passes view mode to MemoList
- Updated `src/index.css` — added styles for `.view-toggle`, `.folder-view`, `.folder`, `.folder-header`, etc.
- View mode selection persists in localStorage
- Version bumped to 1.2.0

## 2026-02-23: Fix audio processing and Chinese language detection
- Fixed zh-CN language parameter being treated as falsy in transcribe API
- Added explicit language validation in `api/src/functions/transcribe.ts`
- Added comprehensive WAV header validation (RIFF/WAVE format check)
- Fixed audio format mismatch - now reads actual format from WAV header (sample rate, channels, bit depth)
- Added resampling logic in `src/lib/audio.ts` for browsers that don't respect target sample rate
- Changed audio filename from `.webm` to `.wav` in API call
- Added extensive logging for debugging audio pipeline issues
- Version bumped to 1.1.1

## 2026-02-23: Add Chinese language support for voice transcription
- Added `Language` type (`'en-US' | 'zh-CN'`) to `src/types.ts`
- Created `src/lib/settings.ts` — localStorage utility for persisting language preference
- Updated `api/src/functions/transcribe.ts` — accepts optional `language` form field for Azure Speech Service
- Updated `src/lib/api.ts` — passes `language` parameter to transcription endpoint
- Created `src/components/LanguageSelector.tsx` — dropdown component for language selection (English/中文)
- Updated `src/components/App.tsx` — adds language state, integrates LanguageSelector in header
- Updated `src/components/Recorder.tsx` — accepts and passes `language` prop to transcription API
- Updated `src/index.css` — added styles for `.language-selector` and `.header-controls`
- Language selection persists in localStorage, defaults to English

## 2026-02-23: Add version bump to deployment workflow
- Updated `CLAUDE.md` - added step 1 to bump version in `src/version.ts` before each commit
- Bumped version to 1.0.1 in `src/version.ts`

## 2026-02-23: Update CLAUDE.md deployment workflow
- Enhanced Deployment Workflow section to explicitly mention updating HISTORY.md and CLAUDE.md before committing
- Added "CRITICAL - NEVER FORGET" emphasis to ensure documentation updates aren't missed

## 2026-02-23: Add search feature to memo list
- Updated `src/components/MemoList.tsx` — added search state and filtering logic
- Search filters by both title and content (case-insensitive)
- Search works in combination with existing tag filters
- Added search input with clear button UI
- Updated `src/index.css` — added `.search-container`, `.search-input`, `.search-clear` styles
- Empty state now shows "No memos match [query]" when search has no results

## 2026-02-23: Add version display to app
- Created `src/version.ts` — exports version constant
- Updated `package.json` version from 0.0.0 to 1.0.0
- Modified `src/components/App.tsx` — displays version badge next to app title
- Updated `src/index.css` — added styling for `.version` class
- Version shown as "v1.0.0" in header for tracking deployed versions

## 2026-02-22: Add Bicep templates for Azure infrastructure
- Created `infra/main.bicep` — provisions Azure Static Web App with OPENAI_API_KEY app setting
- Created `infra/main.bicepparam` — parameter defaults file
- Updated README.md with Bicep deployment instructions (`az deployment group create`)
- Updated CLAUDE.md with new infra files

## 2026-02-22: Add README and CI/CD pipeline
- Created README.md with project docs, prerequisites, Azure resource requirements, and deployment setup
- Created `.github/workflows/deploy.yml` GitHub Actions workflow for Azure Static Web App deployment
- Pipeline builds frontend + API and deploys on push to main, with PR staging environments

## 2026-02-22: Implement VoiceMemo app (full MVP)
- Scaffolded Vite + React + TypeScript project
- Created Azure Functions API with `/api/transcribe` endpoint proxying OpenAI Whisper
- Built MediaRecorder wrapper for browser mic capture (`src/lib/audio.ts`)
- Built localStorage-based memo storage with CRUD operations (`src/lib/storage.ts`)
- Created React components: Recorder, MemoList, MemoView, App
- Added dark theme, mobile-friendly CSS styling
- Configured Vite dev proxy to forward `/api` calls to Azure Functions (port 7071)
- Added `staticwebapp.config.json` for Azure SWA deployment
- Both frontend and API builds compile successfully

## YYYY-MM-DD: Initial project creation
- Project initialized with ClaudeManager
- Initial CLAUDE.md, HISTORY.md, and TODO.md created
