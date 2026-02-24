import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { google } from 'googleapis';
import { tokenStore, setTokens } from '../lib/tokenStore.js';

function log(context: InvocationContext, message: string, data?: Record<string, unknown>) {
  const logData = data ? JSON.stringify(data) : '';
  context.log(`[GoogleDriveAuth] ${message} ${logData}`);
}

// OAuth2 configuration from environment
const getOAuthConfig = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
});

app.http('googleDriveAuth', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'google-drive/auth',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    log(context, '=== OAuth authorization request ===');

    const { clientId, redirectUri } = getOAuthConfig();

    if (!clientId) {
      log(context, 'ERROR: GOOGLE_CLIENT_ID not configured');
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Google OAuth not configured' }),
      };
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      getOAuthConfig().clientSecret,
      redirectUri
    );

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      state,
      prompt: 'consent',
    });

    log(context, 'Generated auth URL', { state, hasRedirectUri: !!redirectUri });

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUrl, state }),
    };
  },
});

app.http('googleDriveCallback', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'google-drive/callback',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    log(context, '=== OAuth callback received ===');

    const code = request.query.get('code');
    const state = request.query.get('state');
    const error = request.query.get('error');

    if (error) {
      log(context, 'OAuth error from Google', { error });
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `OAuth error: ${error}` }),
      };
    }

    if (!code) {
      log(context, 'ERROR: No code provided');
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No authorization code provided' }),
      };
    }

    try {
      const { clientId, clientSecret, redirectUri } = getOAuthConfig();

      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      // Exchange code for tokens
      const tokenResponse = await oauth2Client.getToken(code);
      const tokenInfo = tokenResponse.tokens as {
        access_token?: string;
        refresh_token?: string;
        expiry_date?: number;
      };

      log(context, 'Tokens received', {
        hasAccessToken: !!tokenInfo.access_token,
        hasRefreshToken: !!tokenInfo.refresh_token,
      });

      if (!tokenInfo.access_token) {
        throw new Error('No access token received');
      }

      // Store tokens using shared store
      const userId = 'default-user';
      setTokens(userId, {
        access_token: tokenInfo.access_token,
        refresh_token: tokenInfo.refresh_token || '',
        expiry_date: tokenInfo.expiry_date || 0,
      });

      log(context, 'Tokens stored', { userId });

      // Redirect back to app with success
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return {
        status: 302,
        headers: {
          Location: `${frontendUrl}/settings?obsidian=success`,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log(context, 'ERROR: Token exchange failed', { message });
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Token exchange failed: ${message}` }),
      };
    }
  },
});

app.http('googleDriveStatus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'google-drive/status',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    log(context, '=== Status check ===');

    const userId = 'default-user';
    const isConnected = tokenStore.has(userId);

    log(context, 'Connection status', { userId, isConnected });

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connected: isConnected }),
    };
  },
});
