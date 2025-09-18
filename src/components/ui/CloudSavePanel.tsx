import React, { useState, useEffect } from 'react';
import { githubAuth, type GitHubAuthState } from '../../services/githubAuthService';
import { cloudSync, type SyncStatus, type SyncStrategy } from '../../services/cloudSyncService';
import { gistApi } from '../../services/gistApiService';
import { useGameState } from '../../context/GameStateContext';

export default function CloudSavePanel() {
  const { state } = useGameState();
  const [authState, setAuthState] = useState<GitHubAuthState>(githubAuth.getAuthState());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(cloudSync.getSyncStatus());
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  useEffect(() => {
    const unsubAuth = githubAuth.subscribe(setAuthState);
    const unsubSync = cloudSync.subscribe(setSyncStatus);

    return () => {
      unsubAuth();
      unsubSync();
    };
  }, []);

  useEffect(() => {
    setShowConflictDialog(syncStatus.status === 'conflict');
  }, [syncStatus.status]);

  const handleLogin = () => {
    githubAuth.login();
  };

  const handleLogout = () => {
    githubAuth.logout();
  };

  const handleSyncNow = async () => {
    await cloudSync.syncNow(state);
  };

  const handleForceUpload = async () => {
    await cloudSync.forceUpload(state);
  };

  const handleForceDownload = async () => {
    const result = await cloudSync.forceDownload();
    if (result.success) {
      // Reload the page to use the new save data
      window.location.reload();
    }
  };

  const handleResolveConflict = async (strategy: SyncStrategy) => {
    const result = await cloudSync.resolveConflict(strategy);
    if (result.success) {
      setShowConflictDialog(false);
      if (strategy === 'prefer-remote') {
        // Reload page to use remote save
        window.location.reload();
      }
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus.status) {
      case 'idle':
        return syncStatus.lastSync
          ? `Last synced: ${new Date(syncStatus.lastSync).toLocaleString()}`
          : 'Ready to sync';
      case 'syncing':
        return 'Syncing...';
      case 'conflict':
        return 'Conflict detected - requires resolution';
      case 'error':
        return `Error: ${syncStatus.lastError}`;
      case 'offline':
        return 'Offline - will sync when online';
      default:
        return 'Unknown status';
    }
  };

  const getSyncStatusColor = () => {
    switch (syncStatus.status) {
      case 'idle':
        return '#22c55e';
      case 'syncing':
        return '#3b82f6';
      case 'conflict':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      case 'offline':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div style={{
      border: '2px solid var(--border)',
      borderRadius: 16,
      padding: 24,
      background: 'var(--card-bg)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20
      }}>
        <span style={{ fontSize: 24 }}>☁️</span>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Cloud Saves</h3>
      </div>

      {!authState.isAuthenticated ? (
        // Not authenticated
        <div>
          <p style={{ marginBottom: 16, opacity: 0.8 }}>
            Connect with GitHub using a Personal Access Token to enable automatic cloud saves.
            Your progress will be safely backed up to a private GitHub Gist with full version history.
          </p>

          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#22c55e' }}>✨ Benefits:</h4>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
              <li>🔒 <strong>100% Private</strong> - Only you can access your saves</li>
              <li>🕰️ <strong>Version History</strong> - Restore from any previous save</li>
              <li>🔄 <strong>Cross-Device Sync</strong> - Access your progress anywhere</li>
              <li>💾 <strong>Automatic Backups</strong> - Never lose progress again</li>
              <li>🆓 <strong>Completely Free</strong> - Uses GitHub's free tier</li>
            </ul>
          </div>

          <button
            onClick={handleLogin}
            style={{
              background: 'linear-gradient(135deg, #24292e, #1a1e22)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Setup GitHub Token
          </button>
        </div>
      ) : (
        // Authenticated
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            padding: 12,
            background: 'var(--bg)',
            borderRadius: 8,
            border: '1px solid var(--border)'
          }}>
            <img
              src={authState.user?.avatar_url}
              alt="GitHub Avatar"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%'
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{authState.user?.name || authState.user?.login}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Connected to GitHub</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'var(--border)',
                color: 'var(--fg)',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Disconnect
            </button>
          </div>

          {/* Sync Status */}
          <div style={{
            padding: 12,
            background: 'var(--bg)',
            borderRadius: 8,
            border: '1px solid var(--border)',
            marginBottom: 16
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8
            }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: getSyncStatusColor()
                }}
              />
              <span style={{ fontWeight: 600 }}>Sync Status</span>
            </div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              {getSyncStatusText()}
            </div>
          </div>

          {/* Manual Controls */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 12,
            marginBottom: 16
          }}>
            <button
              onClick={handleSyncNow}
              disabled={syncStatus.status === 'syncing'}
              style={{
                background: syncStatus.status === 'syncing' ? 'var(--border)' : '#3b82f6',
                color: syncStatus.status === 'syncing' ? 'var(--fg)' : 'white',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: syncStatus.status === 'syncing' ? 'not-allowed' : 'pointer'
              }}
            >
              {syncStatus.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>

            <button
              onClick={handleForceUpload}
              style={{
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Upload Save
            </button>

            <button
              onClick={handleForceDownload}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Download Save
            </button>
          </div>

          {/* Gist Link */}
          {gistApi.getSaveUrl() && (
            <div style={{
              padding: 12,
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 8,
              fontSize: 12
            }}>
              <strong>Your Save:</strong>{' '}
              <a
                href={gistApi.getSaveUrl()!}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#3b82f6', textDecoration: 'none' }}
              >
                View on GitHub →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Conflict Resolution Dialog */}
      {showConflictDialog && syncStatus.conflictData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: 16,
            padding: 24,
            maxWidth: 600,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '2px solid var(--border)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f59e0b' }}>⚠️ Sync Conflict Detected</h3>

            <p style={{ marginBottom: 20, opacity: 0.8 }}>
              Your local save and cloud save have diverged. This usually happens when you've been
              playing on multiple devices. Choose how to resolve:
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 20
            }}>
              <div style={{
                padding: 16,
                background: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--border)'
              }}>
                <h4 style={{ margin: '0 0 8px 0' }}>📱 Local Save</h4>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Updated: {formatTimestamp(syncStatus.conflictData.localTimestamp)}
                </div>
                <div style={{ fontSize: 12 }}>
                  Level: {syncStatus.conflictData.local.character.level}
                </div>
              </div>

              <div style={{
                padding: 16,
                background: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--border)'
              }}>
                <h4 style={{ margin: '0 0 8px 0' }}>☁️ Cloud Save</h4>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Updated: {formatTimestamp(syncStatus.conflictData.remoteTimestamp)}
                </div>
                <div style={{ fontSize: 12 }}>
                  Level: {syncStatus.conflictData.remote.character.level}
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gap: 12
            }}>
              <button
                onClick={() => handleResolveConflict('prefer-local')}
                style={{
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Use Local Save (Keep current progress)
              </button>

              <button
                onClick={() => handleResolveConflict('prefer-remote')}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Use Cloud Save (Download from cloud)
              </button>

              <button
                onClick={() => handleResolveConflict('merge-progressive')}
                style={{
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Smart Merge (Keep highest levels/progress)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}