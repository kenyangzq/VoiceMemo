import { useState, useEffect } from 'react';
import { settings } from '../lib/settings';
import {
  getGoogleDriveAuthUrl,
  checkGoogleDriveConnection,
} from '../lib/api';
import type { ObsidianSettings } from '../types';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const [obsidianSettings, setObsidianSettings] = useState<ObsidianSettings>(
    settings.getObsidianSettings()
  );
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Check connection status on mount and when returning from OAuth flow
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await checkGoogleDriveConnection();
        setIsConnected(result.connected);
      } catch {
        setIsConnected(false);
      }
    };

    // Check if returning from OAuth flow
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('obsidian') === 'success') {
      setStatus('success');
      setStatusMessage('Successfully connected to Google Drive!');
      // Clear URL param
      window.history.replaceState({}, '', '/settings');
    }

    checkConnection();
  }, []);

  const handleAuthorize = async () => {
    setIsConnecting(true);
    setStatus('idle');
    try {
      const { authUrl } = await getGoogleDriveAuthUrl();
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (err) {
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : 'Failed to start authorization');
      setIsConnecting(false);
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    const newSettings = { ...obsidianSettings, enabled };
    setObsidianSettings(newSettings);
    settings.setObsidianSettings(newSettings);
  };

  const handleFolderChange = (folderPath: string) => {
    const newSettings = { ...obsidianSettings, folderPath };
    setObsidianSettings(newSettings);
    settings.setObsidianSettings(newSettings);
  };

  const handleToggleSyncOnSave = (syncOnSave: boolean) => {
    const newSettings = { ...obsidianSettings, syncOnSave };
    setObsidianSettings(newSettings);
    settings.setObsidianSettings(newSettings);
  };

  return (
    <div className="settings">
      <header className="settings-header">
        <button className="back-btn" onClick={onBack}>
          &larr; Back
        </button>
        <h1>Settings</h1>
      </header>

      <main className="settings-main">
        <section className="settings-section">
          <h2>Obsidian Sync</h2>
          <p className="settings-description">
            Sync your voice memos to your Obsidian vault on Google Drive. Memos are saved as markdown files with YAML frontmatter.
          </p>

          {/* Connection Status */}
          <div className="settings-item">
            <div className="settings-item-label">Google Drive Connection</div>
            <div className="connection-status">
              {isConnected ? (
                <span className="status-badge connected">Connected</span>
              ) : (
                <span className="status-badge disconnected">Not Connected</span>
              )}
              <button
                className="btn-primary"
                onClick={handleAuthorize}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : isConnected ? 'Reauthorize' : 'Connect to Google Drive'}
              </button>
            </div>
          </div>

          {/* Status Messages */}
          {status === 'success' && (
            <div className="status-message success">{statusMessage}</div>
          )}
          {status === 'error' && (
            <div className="status-message error">{statusMessage}</div>
          )}

          {/* Enable Sync */}
          <div className="settings-item">
            <div className="settings-item-label">
              <span>Enable Obsidian Sync</span>
              <span className="settings-item-hint">
                Automatically sync memos to Google Drive
              </span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={obsidianSettings.enabled}
                onChange={(e) => handleToggleEnabled(e.target.checked)}
                disabled={!isConnected}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Sync on Save */}
          <div className="settings-item">
            <div className="settings-item-label">
              <span>Sync on Save</span>
              <span className="settings-item-hint">
                Immediately sync when saving or updating memos
              </span>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={obsidianSettings.syncOnSave}
                onChange={(e) => handleToggleSyncOnSave(e.target.checked)}
                disabled={!isConnected || !obsidianSettings.enabled}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Folder Path */}
          <div className="settings-item">
            <div className="settings-item-label">
              <span>Drive Folder</span>
              <span className="settings-item-hint">
                Folder name in Google Drive (will be created if it doesn't exist)
              </span>
            </div>
            <input
              type="text"
              value={obsidianSettings.folderPath}
              onChange={(e) => handleFolderChange(e.target.value)}
              disabled={!isConnected || !obsidianSettings.enabled}
              className="settings-input"
              placeholder="VoiceMemos"
            />
          </div>

          {!isConnected && (
            <div className="settings-notice">
              <strong>Note:</strong> You need to connect to Google Drive first before enabling sync.
              After connecting, you can choose which folder memos are saved to.
            </div>
          )}
        </section>

        <section className="settings-section">
          <h2>About</h2>
          <div className="settings-item">
            <div className="settings-item-label">VoiceMemo</div>
            <div className="settings-item-value">
              Voice to memo app with Obsidian integration
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
