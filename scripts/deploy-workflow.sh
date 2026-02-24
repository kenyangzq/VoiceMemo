#!/bin/bash
# Deployment workflow helper for VoiceMemo
# This script helps ensure all deployment steps are completed

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== VoiceMemo Deployment Workflow ==="
echo ""

# Step 1: Check for uncommitted changes
if [ -z "$(git status --porcelain)" ]; then
    echo "No changes detected. Nothing to deploy."
    exit 0
fi

echo "Current changes:"
git status --short
echo ""

# Step 2: Prompt for version bump
echo "Current version:"
grep "export const VERSION" src/version.ts || echo "Not found"
echo ""
read -p "Enter new version (e.g., 1.2.3): " NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
    echo "No version provided. Aborting."
    exit 1
fi

# Step 3: Update version files
echo "Updating version to $NEW_VERSION..."
sed -i "s/export const VERSION = .*/export const VERSION = \"$NEW_VERSION\";/" src/version.ts
sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json

# Step 4: Prompt for changelog entry
echo ""
echo "Enter changelog entry (one line summary):"
read -p "> " CHANGELOG_ENTRY

if [ -z "$CHANGELOG_ENTRY" ]; then
    echo "No changelog entry provided. Aborting."
    exit 1
fi

# Step 5: Update HISTORY.md
TODAY=$(date +%Y-%m-%d)
TEMP_FILE=$(mktemp)
{
    echo "## $TODAY: $CHANGELOG_ENTRY"
    echo "- See git commit for details"
    echo ""
    cat HISTORY.md
} > "$TEMP_FILE"
mv "$TEMP_FILE" HISTORY.md

# Step 6: Show what will be committed
echo ""
echo "Files to be committed:"
git status --short
echo ""
git diff --stat

# Step 7: Confirm and commit
read -p "Commit and push these changes? (y/N): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Aborted by user."
    exit 0
fi

# Commit and push
echo ""
echo "Committing..."
git add src/version.ts package.json HISTORY.md CLAUDE.md 2>/dev/null || true
git add -A
git commit -m "$CHANGELOG_ENTRY

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

echo "Pushing..."
git push origin main

echo ""
echo "=== Deployment triggered! ==="
echo "GitHub Actions will deploy to Azure Static Web App."
