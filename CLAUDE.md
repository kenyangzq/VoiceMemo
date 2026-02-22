# VoiceMemo

## Purpose
Voice memo web app — record audio via browser mic, transcribe with OpenAI Whisper, save as markdown.

## Architecture
- **Frontend**: React + TypeScript (Vite) — SPA at `/src`
- **Backend API**: Azure Functions v4 (Node.js) at `/api`
- **STT**: OpenAI Whisper API (`POST /v1/audio/transcriptions`)
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
- `api/src/functions/transcribe.ts` — Whisper API proxy function
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
