# VoiceMemo

Record voice memos in your browser, transcribe them with OpenAI Whisper, and save as markdown.

## Features

- Browser-based mic recording (MediaRecorder API)
- Automatic transcription via OpenAI Whisper
- Markdown memo storage (localStorage, upgradeable to Azure Blob)
- Dark theme, mobile-friendly UI

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Azure Functions Core Tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local) v4
- [OpenAI API key](https://platform.openai.com/api-keys)

## Azure Resources Needed

To deploy this app you need **one** Azure resource:

| Resource | Purpose |
|----------|---------|
| **Azure Static Web App** | Hosts the React frontend + Azure Functions API |

> Azure Static Web Apps bundles both the frontend and the serverless API in a single resource — no separate Function App or App Service needed.

### Deploy with Bicep (recommended)

Bicep templates are in `/infra`. Deploy the Azure resources with the Azure CLI:

```bash
# Login and set subscription
az login
az account set --subscription <your-subscription-id>

# Create resource group
az group create --name rg-voicememo --location eastus2

# Deploy infrastructure (prompts for OpenAI API key)
az deployment group create \
  --resource-group rg-voicememo \
  --template-file infra/main.bicep \
  --parameters staticWebAppName=voicememo \
               openAiApiKey=<your-openai-key> \
               repositoryUrl=https://github.com/<user>/VoiceMemo

# Get the deployment token for GitHub Actions
az deployment group show \
  --resource-group rg-voicememo \
  --name main \
  --query properties.outputs.deploymentToken.value -o tsv
```

Then add the deployment token as a GitHub secret:
```bash
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body "<token-from-above>"
```

### Manual Deployment Setup

1. Create an **Azure Static Web App** in the Azure Portal (or via `az staticwebapp create`)
2. Link it to your GitHub repo — this auto-generates the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret
3. Add the application setting `OPENAI_API_KEY` with your OpenAI key:
   - Azure Portal → Static Web App → Configuration → Application settings
4. Push to `main` — GitHub Actions builds and deploys automatically

### GitHub Secrets Required

| Secret | How to get it |
|--------|---------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Output from Bicep deployment, or find it under Overview → Manage deployment token |

### Azure App Settings Required

| Setting | Value |
|---------|-------|
| `OPENAI_API_KEY` | Set automatically by Bicep, or manually via Azure Portal → Configuration → Application settings |

## Local Development

### 1. Install dependencies

```bash
npm install
cd api && npm install && cd ..
```

### 2. Configure API key

Edit `api/local.settings.json` and set your OpenAI API key:

```json
{
  "Values": {
    "OPENAI_API_KEY": "sk-..."
  }
}
```

### 3. Run

```bash
# Terminal 1 — API (port 7071)
cd api && npm run dev

# Terminal 2 — Frontend (port 5173, proxies /api → 7071)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
├── src/                        # React frontend
│   ├── components/
│   │   ├── App.tsx             # App shell
│   │   ├── Recorder.tsx        # Mic recording + transcription
│   │   ├── MemoList.tsx        # Memo list view
│   │   └── MemoView.tsx        # Single memo viewer
│   ├── lib/
│   │   ├── audio.ts            # MediaRecorder wrapper
│   │   ├── api.ts              # API client
│   │   └── storage.ts          # localStorage CRUD
│   └── types.ts
├── api/                        # Azure Functions backend
│   └── src/functions/
│       └── transcribe.ts       # Whisper API proxy
├── infra/                      # Azure Bicep templates
│   ├── main.bicep              # Static Web App + settings
│   └── main.bicepparam         # Parameter defaults
├── .github/workflows/
│   └── deploy.yml              # CI/CD pipeline
├── staticwebapp.config.json    # Azure SWA routing
└── vite.config.ts
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on every push to `main` and on pull requests:

- Installs dependencies (frontend + API)
- Builds both TypeScript projects
- Deploys to Azure Static Web App
- PR builds get a staging preview URL automatically

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Azure Functions v4 (Node.js)
- **Speech-to-Text**: OpenAI Whisper API
- **Deployment**: Azure Static Web Apps + GitHub Actions
