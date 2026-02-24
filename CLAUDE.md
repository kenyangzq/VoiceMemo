# VoiceMemo

## Purpose
Voice memo web app — record audio via browser mic, transcribe with Azure Speech Service, save as markdown. Includes Obsidian sync via Google Drive.

## Architecture
- **Frontend**: React + TypeScript (Vite) — SPA at `/src`
- **Backend API**: Azure Functions v4 (Node.js) at `/api`
- **STT**: Azure Speech Service SDK
- **Storage**: Browser localStorage (markdown format), with optional Google Drive sync
- **Deployment**: Azure Static Web App (planned)

## Key Files
- `src/components/App.tsx` — Main app shell, routing between list/view/settings, language and view mode state
- `src/components/Recorder.tsx` — Mic recording UI + transcription flow
- `src/components/MemoList.tsx` — Memo list with three view modes: flat, tag folders, date folders
- `src/components/MemoView.tsx` — Single memo viewer (rendered markdown)
- `src/components/Settings.tsx` — Settings page with Obsidian sync configuration
- `src/components/LanguageSelector.tsx` — Language dropdown (English/中文)
- `src/components/ViewToggle.tsx` — Toggle for switching between flat, tag-folders, and date-folders views
- `src/lib/audio.ts` — MediaRecorder API wrapper
- `src/lib/api.ts` — API client (transcribe, generate-title, Google Drive OAuth and write)
- `src/lib/storage.ts` — localStorage CRUD for memos with async Obsidian sync
- `src/lib/settings.ts` — localStorage for language, view mode, and Obsidian settings
- `src/lib/tokenStore.ts` — Shared token store for Google Drive OAuth (API)
- `src/types.ts` — Shared TypeScript interfaces including `Language`, `ViewMode`, and `ObsidianSettings` types
- `src/version.ts` — App version constant (displayed in header)
- `api/src/functions/transcribe.ts` — Azure Speech Service proxy function (supports language parameter)
- `api/src/functions/generateTitle.ts` — Gemini Flash title generation (POST /api/generate-title)
- `api/src/functions/google-drive-auth.ts` — Google Drive OAuth endpoints (auth, callback, status)
- `api/src/functions/google-drive-write.ts` — Google Drive file write endpoint
- `vite.config.ts` — Vite config with dev proxy to Azure Functions
- `staticwebapp.config.json` — Azure SWA routing
- `infra/main.bicep` — Bicep template for Azure Static Web App
- `.github/workflows/deploy.yml` — GitHub Actions CI/CD pipeline
- `docs/GOOGLE_DRIVE_SETUP.md` — Instructions for setting up Google Cloud OAuth

## Development
- Frontend: `npm run dev` (port 5173, proxies `/api` to 7071)
- API: `cd api && npm run dev` (Azure Functions Core Tools, port 7071)
- Build: `npm run build` (frontend) / `cd api && npm run build` (API)
- Requires `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION` in `api/local.settings.json`
- Optional: `GEMINI_API_KEY` in `api/local.settings.json` for AI title generation
- Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL` for Obsidian sync (see `docs/GOOGLE_DRIVE_SETUP.md`)

## Conventions
- TypeScript strict mode
- ESM modules (`"type": "module"`)
- CSS in `src/index.css` (no CSS modules/styled-components)
- Dark theme by default

## Deployment Workflow
**!!! CRITICAL - MANDATORY AFTER EVERY TASK !!!**

After completing ANY unit of work (bug fix, feature, refactor), you MUST:

1. Bump version:
   - `src/version.ts` - increment version number (use semantic versioning)
   - `package.json` - keep in sync with src/version.ts

2. Update project documentation:
   - `HISTORY.md` - append changelog entry (append-only, newest first)
   - `CLAUDE.md` - if architecture/dependencies/patterns changed

3. Commit and push changes:
   - `git add` the changed files (including version and docs)
   - `git commit` with descriptive message
   - `git push origin main` to trigger deployment via GitHub Actions

**Helper script**: Use `./scripts/deploy-workflow.sh` to automate this process.

This ensures changes are deployed to Azure Static Web App automatically.
