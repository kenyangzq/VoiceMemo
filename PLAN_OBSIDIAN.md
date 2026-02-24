# Obsidian Integration Plan

## Current State
- VoiceMemo stores data in browser localStorage
- Memos are markdown formatted (title + content)
- Tags, timestamps, and duration metadata tracked separately
- Obsidian vault is on Google Drive

## Integration Options

### Option 1: Google Drive API Direct Integration ⭐ Recommended

**Approach:** Add Google Drive API to write markdown files directly to the Obsidian vault folder on Google Drive.

**Pros:**
- Direct write to Obsidian vault
- Real-time sync when Obsidian's Google Drive plugin syncs
- Files accessible immediately on all devices with Obsidian
- No manual export/import needed

**Cons:**
- Requires OAuth 2.0 flow with Google
- Requires user to authorize Google Drive access
- Token management and refresh handling
- Additional Azure Function needed for API proxy

**Implementation:**

1. **Azure Function for Google Drive API** (`api/src/functions/google-drive.ts`)
   - Handle OAuth flow and token storage
   - Endpoints: `/api/google-drive/auth`, `/api/google-drive/callback`, `/api/google-drive/write-file`

2. **Frontend Integration**
   - Add Obsidian sync toggle in settings
   - When enabled, write each memo to Google Drive on save
   - Format with Obsidian YAML frontmatter

3. **File Format** (Obsidian-compatible markdown):
   ```markdown
   ---
   type: voice-memo
   created: 2026-02-24T10:30:00.000Z
   duration_seconds: 45
   tags:
     - work
     - ideas
   segments: 2
   voice_id: "uuid-here"
   ---

   # Memo Title

   Transcribed content here...
   ```

4. **Filename Pattern:**
   - `YYYY-MM-DD-HHMMSS.md` for chronological sorting
   - Or `YYYY-MM-DD-{sanitized-title}.md` for readability

**Estimated Effort:** Medium-High

---

### Option 2: Obsidian Sync + Export Feature

**Approach:** Add export/import feature to VoiceMemo; let Obsidian Sync handle the rest.

**Pros:**
- No additional API integrations needed
- User has full control
- Simple to implement

**Cons:**
- Manual export/import required
- Not real-time
- Obsidian Sync requires paid subscription ($4-10/month)

**Implementation:**
1. Add "Export to Markdown" feature (download single .md or ZIP of all memos)
2. Add "Import from Markdown" feature
3. Use Obsidian's built-in Google Drive sync or Obsidian Sync

**Estimated Effort:** Low

---

### Option 3: WebDAV Integration

**Approach:** Use WebDAV protocol which both can support.

**Pros:**
- Standard protocol (supported by many storage providers)
- Obsidian has WebDAV support

**Cons:**
- Requires intermediate WebDAV bridge for Google Drive
- Additional infrastructure needed (e.g., using a service like InfiniCLOUD)

**Estimated Effort:** Medium

---

## Recommended Approach: Option 1 (Google Drive API)

This provides the best user experience for real-time sync with the Obsidian vault on Google Drive.

### Implementation Phases

#### Phase 1: Backend - Azure Function Setup
1. Create Google Cloud Project and enable Drive API
2. Configure OAuth 2.0 consent screen
3. Create `api/src/functions/google-drive.ts` with:
   - OAuth initiation endpoint
   - OAuth callback handler
   - Token storage (Azure Table Storage or similar)
   - File write endpoint

#### Phase 2: Frontend - Settings Integration
1. Add "Obsidian Sync" section to settings
2. Google Drive authorization button
3. Folder path configuration (which folder in Drive)
4. Enable/disable toggle

#### Phase 3: Auto-Sync Integration
1. Hook into `storage.save()` to write to Google Drive
2. Hook into `storage.update()` for updates
3. Handle offline/error states gracefully
4. Add sync status indicator

#### Phase 4: Optional Enhancements
1. Batch sync for existing memos
2. Conflict resolution
3. Selective sync by tags
4. Two-way sync (read from Obsidian)

---

## Technical Details

### Google Drive API Requirements
- OAuth 2.0 scopes: `https://www.googleapis.com/auth/drive.file`
- Redirect URI needs to be configured (Azure Function URL)
- Access tokens stored server-side with refresh capability

### Frontmatter Schema
```yaml
---
type: voice-memo
created: 2026-02-24T10:30:00.000Z
duration_seconds: 45
tags:
  - work
  - ideas
segments: 2
voice_id: "uuid-here"
app: VoiceMemo
app_version: "1.0.0"
---
```

### Error Handling
- Network failures: Queue for retry
- Rate limits: Exponential backoff
- Auth failures: Re-prompt for authorization
- File conflicts: Version with timestamp suffix

---

## Next Steps

1. **Confirm approach** with user (Google Drive API vs simpler export/import)
2. Set up Google Cloud Project if proceeding with Option 1
3. Implement Azure Function for Google Drive integration
4. Add frontend settings UI
5. Implement auto-sync on memo save/update
