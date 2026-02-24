# Plan: Nested Folder Support & Memo Organization

## Overview
Add support for nested folder paths in Google Drive (e.g., `Obsidian/Vault/VoiceMemos`) and allow organizing memos into subfolders by date or tags.

## Current State

### Limitations
1. **Single folder only**: `folderPath` is treated as a single folder name, not a path
2. **No subfolder organization**: All memos go into one flat folder
3. **Folder lookup** searches by name only in root Drive

### Code Locations
- `api/src/functions/google-drive-write.ts:126-161` - Folder logic
- `src/lib/storage.ts` - Sync trigger
- `src/components/Settings.tsx` - UI for folder path

---

## Feature 1: Nested Path Support

### Goal
Support paths like `Obsidian/MyVault/VoiceMemos` where each segment is created if missing.

### Implementation

#### Backend (google-drive-write.ts)

**New helper function: `resolveFolderPath`**
```typescript
async function resolveFolderPath(
  drive: drive_v3.Drive,
  folderPath: string,
  context: InvocationContext
): Promise<string | undefined> {
  if (!folderPath?.trim()) return undefined;

  const segments = folderPath.split('/').map(s => s.trim()).filter(Boolean);
  if (segments.length === 0) return undefined;

  let parentId: string | undefined = 'root'; // Start at Drive root
  let currentFullPath = '';

  for (const segment of segments) {
    currentFullPath = currentFullPath ? `${currentFullPath}/${segment}` : segment;

    // Search for this folder in parent
    const q = parentId === 'root'
      ? `name='${segment}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `name='${segment}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const search = await drive.files.list({
      q,
      fields: 'files(id, name)',
      pageSize: 10,
    });

    const existing = search.data.files?.[0];

    if (existing?.id) {
      parentId = existing.id;
      log(context, 'Found existing folder segment', { segment, fullPath: currentFullPath, id: parentId });
    } else {
      // Create this folder segment
      const created = await drive.files.create({
        requestBody: {
          name: segment,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentId ? [parentId] : undefined,
        },
        fields: 'id',
      });
      parentId = created.data.id;
      log(context, 'Created folder segment', { segment, fullPath: currentFullPath, id: parentId });
    }
  }

  return parentId;
}
```

**Replace existing folder logic (line 126-161) with:**
```typescript
// Resolve nested folder path
const folderId = await resolveFolderPath(drive, folderPath, context);
```

#### Frontend (Settings.tsx)

Update hint text to clarify nested paths are supported:
```tsx
<span className="settings-item-hint">
  Folder path in Google Drive (e.g., Obsidian/Vault/Memos). Creates folders if they don't exist.
</span>
```

---

## Feature 2: Memo Organization by Folders

### Goal
Allow users to organize memos into subfolders based on:
- **Date**: `2025/02`, `2025-02`, or `2025/February`
- **Tags**: Each tag becomes a subfolder

### Design Options

#### Option A: Per-Memo Folder Override
Add an optional `folder` field to `Memo` type that overrides the default folder path.

**Pros:**
- Maximum flexibility
- Each memo can be in a different folder

**Cons:**
- Requires UI for selecting folder per memo
- More complex UX

#### Option B: Dynamic Folder Templates
Define a folder template that can include variables like `{year}`, `{month}`, `{tag}`, `{title}`.

**Examples:**
- `{year}/{month}` → `2025/02/Memo.md`
- `By Tag/{tag}` → `By Tag/work/Memo.md`
- `{year}-{month}-{day}` → `2025-02-24/Memo.md`

**Pros:**
- Powerful organization
- Consistent naming
- Templates can be saved in settings

**Cons:**
- More complex implementation
- Need variable substitution logic

#### Option C: Organize Mode Toggle (Recommended)
Simple approach: add an "Organization Mode" setting with options:
- **Flat**: All memos in base folder (current behavior)
- **By Year/Month**: `2025/02/Memo.md`
- **By Date**: `2025-02-24/Memo.md`
- **By Tag**: Each tag gets a folder

**Pros:**
- Simple UI (dropdown)
- Easy to understand
- Covers common use cases

**Cons:**
- Less flexible than templates

---

## Recommended Implementation: Option C + Per-Memo Tag

### 1. Add to Types

```typescript
// src/types.ts
export type FolderOrganization = 'flat' | 'year-month' | 'date' | 'tag';

export interface ObsidianSettings {
  enabled: boolean;
  folderPath: string;
  syncOnSave: boolean;
  organization: FolderOrganization; // NEW
}
```

### 2. Update Folder Resolution

```typescript
function getMemoSubfolder(memo: Memo, organization: FolderOrganization): string {
  const date = new Date(memo.createdAt);

  switch (organization) {
    case 'year-month':
      return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;

    case 'date':
      return date.toISOString().split('T')[0]; // YYYY-MM-DD

    case 'tag':
      // Use first tag, or 'Untagged' if none
      return memo.tags?.[0] || 'Untagged';

    case 'flat':
    default:
      return '';
  }
}
```

### 3. Combine Base Path + Subfolder

```typescript
// Build full path: base folder + subfolder
const subfolder = getMemoSubfolder(memo, obsidianSettings.organization);
const fullPath = subfolder
  ? `${obsidianSettings.folderPath}/${subfolder}`.replace(/^\/+/, '')
  : obsidianSettings.folderPath;

const folderId = await resolveFolderPath(drive, fullPath, context);
```

### 4. Settings UI

Add dropdown in Settings.tsx:
```tsx
<div className="settings-item">
  <div className="settings-item-label">
    <span>Folder Organization</span>
    <span className="settings-item-hint">
      How to organize memos in subfolders
    </span>
  </div>
  <select
    value={obsidianSettings.organization || 'flat'}
    onChange={(e) => handleOrganizationChange(e.target.value as FolderOrganization)}
    disabled={!isConnected || !obsidianSettings.enabled}
    className="settings-select"
  >
    <option value="flat">Flat (all in one folder)</option>
    <option value="year-month">By Year/Month (2025/02)</option>
    <option value="date">By Date (2025-02-24)</option>
    <option value="tag">By First Tag</option>
  </select>
</div>
```

### 5. Handle Multiple Tags (Future Enhancement)

For `tag` mode with multiple tags, could:
- Copy file to each tag folder (not recommended - duplicates)
- Use primary tag only (current plan)
- Create symlinks/shortcuts (not supported by Drive API well)
- Use YAML frontmatter tags for filtering instead (keep files flat)

---

## API Changes Summary

| File | Change |
|------|--------|
| `api/src/functions/google-drive-write.ts` | Add `resolveFolderPath()` helper, replace folder logic |
| `src/types.ts` | Add `FolderOrganization` type, add to `ObsidianSettings` |
| `src/lib/storage.ts` | Pass organization mode to sync function |
| `src/lib/api.ts` | Update `writeMemoToDrive` to accept subfolder |
| `src/components/Settings.tsx` | Add organization dropdown, update hints |
| `src/lib/settings.ts` | Add `organization` to default settings |

---

## Migration Path

1. **Phase 1**: Implement nested path support only
2. **Phase 2**: Add organization mode dropdown
3. **Phase 3**: Add folder template support (future)

---

## Edge Cases to Handle

1. **Invalid folder names**: Characters not allowed by Drive (`\`, `/`, `<`, `>`, etc.)
2. **Path traversal**: Ensure `../` doesn't escape the base folder
3. **Path length**: Google Drive has limits on path length
4. **Folder name conflicts**: What if user has both `2025/02` and `2025-02`?
5. **Empty paths**: Handle empty string or whitespace-only paths
6. **OAuth scope**: Current `drive.file` scope is sufficient (only creates files)

---

## Testing Checklist

- [ ] Create nested folder `Obsidian/Vault/Memos`
- [ ] Reuse existing nested folder
- [ ] Create folder with special characters (should be handled)
- [ ] Year/month organization creates correct structure
- [ ] Date organization works
- [ ] Tag organization uses first tag or "Untagged"
- [ ] Flat mode doesn't create subfolders
- [ ] Sync updates file in correct folder even if organization changes
