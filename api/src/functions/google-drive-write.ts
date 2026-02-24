import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { google } from 'googleapis';
import { getTokens, setTokens, deleteTokens } from '../lib/tokenStore.js';

function log(context: InvocationContext, message: string, data?: Record<string, unknown>) {
  const logData = data ? JSON.stringify(data) : '';
  context.log(`[GoogleDriveWrite] ${message} ${logData}`);
}

const getOAuthConfig = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
});

// Get or refresh access token
async function getAccessToken(userId: string, context: InvocationContext): Promise<string | null> {
  const tokens = getTokens(userId);
  if (!tokens) {
    log(context, 'No tokens found for user', { userId });
    return null;
  }

  // Check if token needs refresh (expired or expiring soon)
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (tokens.expiry_date && tokens.expiry_date < now + fiveMinutes) {
    if (!tokens.refresh_token) {
      log(context, 'Token expired but no refresh token available');
      deleteTokens(userId);
      return null;
    }

    try {
      log(context, 'Refreshing access token');
      const oauth2Client = new google.auth.OAuth2(
        getOAuthConfig().clientId,
        getOAuthConfig().clientSecret,
        getOAuthConfig().redirectUri
      );

      oauth2Client.setCredentials({
        refresh_token: tokens.refresh_token,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      const newTokens = credentials as {
        access_token?: string;
        expiry_date?: number;
      };

      if (!newTokens.access_token) {
        throw new Error('No access token after refresh');
      }

      // Update stored tokens
      setTokens(userId, {
        access_token: newTokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: newTokens.expiry_date || 0,
      });

      log(context, 'Token refreshed successfully');
      return newTokens.access_token;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log(context, 'ERROR: Token refresh failed', { message });
      deleteTokens(userId);
      return null;
    }
  }

  return tokens.access_token;
}

// Resolve a nested folder path, creating folders as needed
// e.g., "Obsidian/Vault/Memos" creates each level
async function resolveFolderPath(
  drive: any,
  folderPath: string,
  context: InvocationContext
): Promise<string | undefined> {
  if (!folderPath?.trim()) return undefined;

  // Split by forward slash, trim whitespace, filter empty segments
  const segments = folderPath.split('/').map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return undefined;

  let parentId: string | undefined = 'root'; // Start at Drive root
  let currentFullPath = '';

  for (const segment of segments) {
    currentFullPath = currentFullPath ? `${currentFullPath}/${segment}` : segment;

    // Escape single quotes in folder name for query
    const escapedName = segment.replace(/'/g, "\\'");

    // Search for this folder in parent
    const q: string = parentId === 'root'
      ? `name='${escapedName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `name='${escapedName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const search = await drive.files.list({
      q,
      fields: 'files(id, name)',
      pageSize: 10,
    });

    const existing = search.data.files?.[0] as { id?: string; name?: string } | undefined;

    if (existing?.id) {
      parentId = existing.id;
      log(context, 'Found existing folder segment', { segment, fullPath: currentFullPath, id: parentId });
    } else {
      // Create this folder segment
      const created: { data: { id?: string } } = await drive.files.create({
        requestBody: {
          name: segment,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentId ? [parentId] : undefined,
        },
        fields: 'id',
      });
      parentId = created.data.id || undefined;
      log(context, 'Created folder segment', { segment, fullPath: currentFullPath, id: parentId });
    }
  }

  return parentId;
}

app.http('googleDriveWrite', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'google-drive/write',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    log(context, '=== Write file request ===');

    const userId = 'default-user';

    try {
      const body = await request.json() as {
        filename: string;
        content: string;
        folderPath?: string;
      };

      const { filename, content, folderPath } = body;

      if (!filename || !content) {
        log(context, 'ERROR: Missing required fields');
        return {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing filename or content' }),
        };
      }

      log(context, 'Request details', { filename, hasFolder: !!folderPath, contentLength: content.length });

      // Get access token
      const accessToken = await getAccessToken(userId, context);
      if (!accessToken) {
        log(context, 'ERROR: No valid access token');
        return {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Not connected to Google Drive. Please authorize first.' }),
        };
      }

      // Create Drive API client
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const drive = google.drive({ version: 'v3', auth });

      // Find or create the target folder (supports nested paths)
      let folderId: string | undefined;

      if (folderPath && folderPath.trim()) {
        log(context, 'Resolving folder path', { folderPath });

        try {
          folderId = await resolveFolderPath(drive, folderPath, context);
          if (folderId) {
            log(context, 'Folder resolved', { folderId });
          } else {
            log(context, 'No folder path resolved, using root');
          }
        } catch (err) {
          log(context, 'WARNING: Folder resolution failed, using root', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Check if file already exists
      log(context, 'Checking for existing file');
      const searchQuery = folderId
        ? `name='${filename}' and '${folderId}' in parents and trashed=false`
        : `name='${filename}' and trashed=false`;

      const existingFiles = await drive.files.list({
        q: searchQuery,
        fields: 'files(id, name)',
        pageSize: 1,
      });

      const existingFile = existingFiles.data.files?.[0];

      let fileId: string;
      if (existingFile?.id) {
        // Update existing file
        fileId = existingFile.id;
        log(context, 'Updating existing file', { fileId });

        await drive.files.update({
          fileId,
          media: {
            mimeType: 'text/markdown',
            body: content,
          },
        });
      } else {
        // Create new file
        log(context, 'Creating new file');

        const file = await drive.files.create({
          requestBody: {
            name: filename,
            mimeType: 'text/markdown',
            parents: folderId ? [folderId] : undefined,
          },
          media: {
            mimeType: 'text/markdown',
            body: content,
          },
          fields: 'id',
        });

        fileId = file.data.id!;
        log(context, 'File created', { fileId });
      }

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          fileId,
          message: existingFile ? 'File updated' : 'File created',
        }),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const stack = err instanceof Error ? err.stack : undefined;
      log(context, 'ERROR: Write failed', { message, stack });

      // Check for auth error
      if (message.includes('invalid') || message.includes('auth') || message.includes('401')) {
        return {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Authentication failed. Please re-authorize.' }),
        };
      }

      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Write failed: ${message}` }),
      };
    }
  },
});
