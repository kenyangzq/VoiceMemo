# VoiceMemo

## Purpose
Voice memo web app — record audio via browser mic, transcribe with Azure Speech Service, save as markdown.

## Architecture
- **Frontend**: React + TypeScript (Vite) — SPA at `/src`
- **Backend API**: Azure Functions v4 (Node.js) at `/api`
- **STT**: Azure Speech Service SDK
- **Storage**: Browser localStorage (markdown format), planned migration to Azure Blob
- **Deployment**: Azure Static Web App (planned)

## Key Files
- `src/components/App.tsx` — Main app shell, routing between list/view, language state
- `src/components/Recorder.tsx` — Mic recording UI + transcription flow
- `src/components/MemoList.tsx` — Chronological memo list
- `src/components/MemoView.tsx` — Single memo viewer (rendered markdown)
- `src/components/LanguageSelector.tsx` — Language dropdown (English/中文)
- `src/lib/audio.ts` — MediaRecorder API wrapper
- `src/lib/api.ts` — API client (calls `/api/transcribe`)
- `src/lib/storage.ts` — localStorage CRUD for memos
- `src/lib/settings.ts` — localStorage for language preference
- `src/types.ts` — Shared TypeScript interfaces including `Language` type
- `src/version.ts` — App version constant (displayed in header)
- `api/src/functions/transcribe.ts` — Azure Speech Service proxy function (supports language parameter)
- `vite.config.ts` — Vite config with dev proxy to Azure Functions
- `staticwebapp.config.json` — Azure SWA routing
- `infra/main.bicep` — Bicep template for Azure Static Web App
- `.github/workflows/deploy.yml` — GitHub Actions CI/CD pipeline

## Development
- Frontend: `npm run dev` (port 5173, proxies `/api` to 7071)
- API: `cd api && npm run dev` (Azure Functions Core Tools, port 7071)
- Build: `npm run build` (frontend) / `cd api && npm run build` (API)
- Requires `OPENAI_API_KEY` in `api/local.settings.json`

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
