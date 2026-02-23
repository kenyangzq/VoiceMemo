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
- `src/components/App.tsx` — Main app shell, routing between list/view
- `src/components/Recorder.tsx` — Mic recording UI + transcription flow
- `src/components/MemoList.tsx` — Chronological memo list
- `src/components/MemoView.tsx` — Single memo viewer (rendered markdown)
- `src/lib/audio.ts` — MediaRecorder API wrapper
- `src/lib/api.ts` — API client (calls `/api/transcribe`)
- `src/lib/storage.ts` — localStorage CRUD for memos
- `src/types.ts` — Shared TypeScript interfaces
- `src/version.ts` — App version constant (displayed in header)
- `api/src/functions/transcribe.ts` — Azure Speech Service proxy function
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
**CRITICAL - NEVER FORGET**: After completing any unit of work (bug fix, feature, refactor), ALWAYS:

1. Update project documentation:
   - `HISTORY.md` - append changelog entry (append-only, newest first)
   - `CLAUDE.md` - if architecture/dependencies/patterns changed

2. Commit and push changes:
   - `git add` the changed files (including documentation)
   - `git commit` with descriptive message
   - `git push origin main` to trigger deployment via GitHub Actions

This ensures changes are deployed to Azure Static Web App automatically.
