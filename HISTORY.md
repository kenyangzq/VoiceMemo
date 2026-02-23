# Changelog

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
