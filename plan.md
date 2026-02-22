# VoiceMemo - Implementation Plan

## Tech Stack
- **Frontend**: React + TypeScript (Vite)
- **Voice Capture**: Browser MediaRecorder API (WebM/Opus)
- **Speech-to-Text**: OpenAI Whisper API
- **Backend API**: Azure Functions (in `/api` folder, Azure SWA convention)
- **Storage**: Browser localStorage (markdown format), migrate later
- **Deployment**: Azure Static Web App with GitHub Actions CI/CD (set up later)

## Project Structure
```
VoiceMemo/
├── src/                    # React frontend
│   ├── components/
│   │   ├── App.tsx         # Main app shell
│   │   ├── Recorder.tsx    # Mic recording UI + logic
│   │   ├── MemoList.tsx    # List of saved memos
│   │   └── MemoView.tsx    # Single memo viewer (rendered markdown)
│   ├── lib/
│   │   ├── audio.ts        # MediaRecorder wrapper
│   │   ├── api.ts          # API client (calls /api/transcribe)
│   │   └── storage.ts      # localStorage CRUD for memos
│   ├── types.ts            # Shared types (Memo interface)
│   ├── index.css           # Global styles
│   └── main.tsx            # Entry point
├── api/                    # Azure Functions backend
│   ├── src/
│   │   └── functions/
│   │       └── transcribe.ts  # Whisper API proxy function
│   ├── package.json
│   ├── tsconfig.json
│   └── host.json
├── package.json            # Frontend deps
├── tsconfig.json
├── vite.config.ts
├── index.html
├── staticwebapp.config.json  # Azure SWA routing config
└── .gitignore
```

## Implementation Steps

### Step 1: Project Scaffolding
- Initialize Vite + React + TypeScript project
- Set up `.gitignore`, `tsconfig.json`, `vite.config.ts`
- Install dependencies: react, react-dom, react-markdown

### Step 2: Azure Functions API (`/api`)
- Set up Node.js Azure Functions project in `/api`
- Create `transcribe` function:
  - Accepts audio blob (multipart/form-data)
  - Forwards to OpenAI Whisper API (`POST https://api.openai.com/v1/audio/transcriptions`)
  - Returns transcription text
- Reads `OPENAI_API_KEY` from environment

### Step 3: Audio Recording (`src/lib/audio.ts`)
- Wrapper around MediaRecorder API
- Start/stop recording
- Returns audio Blob (WebM format)

### Step 4: Storage Layer (`src/lib/storage.ts`)
- CRUD operations on localStorage
- Memo format: `{ id, title, content (markdown), createdAt, duration }`
- List, get, delete, save operations

### Step 5: React Components
- **Recorder.tsx**: Record button (hold or toggle), visual feedback, sends audio to API, saves result
- **MemoList.tsx**: Chronological list of memos with date/duration
- **MemoView.tsx**: Renders markdown content of a selected memo
- **App.tsx**: Layout shell, routes between list and view

### Step 6: Styling
- Clean, minimal UI
- Mobile-friendly (voice memos are often on mobile)

### Step 7: Local Dev & Testing
- `npm run dev` serves frontend on :5173
- Azure Functions Core Tools serves API on :7071
- Vite proxy config to forward `/api` calls to Functions runtime
