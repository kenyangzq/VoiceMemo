# Google Drive OAuth Setup for VoiceMemo Obsidian Sync

This guide walks you through setting up Google Drive API access for the VoiceMemo Obsidian sync feature.

## Prerequisites

- A Google account
- Access to the VoiceMemo Azure Function backend

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top and select **"New Project"**
3. Enter a project name (e.g., "VoiceMemo-Obsidian-Sync")
4. Click **Create**

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, navigate to **APIs & Services > Library**
2. Search for "Google Drive API"
3. Click on it and press **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace account)
3. Click **Create**
4. Fill in the required information:
   - App name: `VoiceMemo Obsidian Sync`
   - User support email: Your email
   - Developer contact: Your email
5. Click **Save and Continue**
6. Skip the Scopes section for now (click **Save and Continue**)
7. Add test users (your email address) - **Required for testing**
8. Click **Save and Continue**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **+ Create Credentials** > **OAuth client ID**
3. Application type: **Web application**
4. Name: `VoiceMemo Web Client`
5. **Authorized redirect URIs** - Add your Azure Function URL:
   - Development: `http://localhost:7071/api/google-drive/callback`
   - Production: `https://your-azure-function-app.azurewebsites.net/api/google-drive/callback`
6. Click **Create**

## Step 5: Save Your Credentials

After creating the OAuth client, you'll see a dialog with:
- **Client ID** - Copy this
- **Client Secret** - Copy this

## Step 6: Configure Azure Function Environment Variables

Add the following to your Azure Function App settings (or `local.settings.json` for local development):

```json
{
  "GOOGLE_CLIENT_ID": "your-client-id-here.apps.googleusercontent.com",
  "GOOGLE_CLIENT_SECRET": "your-client-secret-here",
  "GOOGLE_REDIRECT_URI": "https://your-azure-function-app.azurewebsites.net/api/google-drive/callback",
  "FRONTEND_URL": "https://your-frontend-url.com"
}
```

For local development:
```json
{
  "GOOGLE_CLIENT_ID": "your-client-id-here.apps.googleusercontent.com",
  "GOOGLE_CLIENT_SECRET": "your-client-secret-here",
  "GOOGLE_REDIRECT_URI": "http://localhost:7071/api/google-drive/callback",
  "FRONTEND_URL": "http://localhost:5173"
}
```

## Step 7: Test the Integration

1. Start your Azure Functions backend locally
2. Open VoiceMemo in your browser
3. Go to Settings
4. Click **"Connect to Google Drive"**
5. Authorize the app with your Google account
6. Enable **Obsidian Sync**
7. Set your Google Drive folder name (e.g., `VoiceMemos`)
8. Save a new memo - it should appear in your Google Drive

## Troubleshooting

### "Google OAuth not configured" error
- Verify `GOOGLE_CLIENT_ID` is set in your Function App settings
- Restart the Azure Function App after updating settings

### "Token exchange failed" error
- Check that the redirect URI in Google Console matches exactly
- Make sure your Google account is added as a test user

### Files not appearing in Google Drive
- Check the Azure Function logs for errors
- Verify the folder path in settings matches your Google Drive
- Ensure the OAuth scope `https://www.googleapis.com/auth/drive.file` is granted

### OAuth consent screen shows "unverified app"
- This is normal for new apps in testing
- Add your email as a test user in the OAuth consent screen
- For production, you'll need to complete the verification process

## Security Notes

- The OAuth 2.0 flow ensures the app can only access files it creates
- The `drive.file` scope limits access to files the app has created or opened
- Refresh tokens are stored server-side (in production, use Azure Table Storage)
- Consider implementing user authentication for multi-tenant deployments

## Production Deployment

For production use:

1. Complete the Google OAuth verification process to remove the "unverified app" warning
2. Implement persistent token storage (Azure Table Storage or similar)
3. Add proper user authentication to identify which tokens belong to which user
4. Set up proper error monitoring and logging
5. Configure rate limiting for the API endpoints
