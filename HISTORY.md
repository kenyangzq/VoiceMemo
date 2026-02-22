# Changelog

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
