import type { GameState } from '../types/gameTypes';
import { githubAuth } from './githubAuthService';
import { gistApi } from './gistApiService';
import { saveGameState, loadGameState } from './persistenceService';

interface SyncStatus {
  status: 'idle' | 'syncing' | 'conflict' | 'error' | 'offline';
  lastSync: string | null;
  lastError: string | null;
  conflictData?: {
    local: GameState;
    remote: GameState;
    localTimestamp: string;
    remoteTimestamp: string;
  };
}

interface SyncResult {
  success: boolean;
  hasConflict: boolean;
  error?: string;
}

type SyncStrategy = 'prefer-remote' | 'prefer-local' | 'merge-progressive' | 'manual';

class CloudSyncService {
  private syncStatus: SyncStatus = {
    status: 'idle',
    lastSync: null,
    lastError: null
  };

  private listeners: ((status: SyncStatus) => void)[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private pendingChanges: GameState | null = null;
  private isOnline = navigator.onLine;

  constructor() {
    // Load last sync timestamp
    const lastSync = localStorage.getItem('studyfall_last_sync');
    if (lastSync) {
      this.syncStatus.lastSync = lastSync;
    }

    // Set up online/offline detection
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Start auto-sync when authenticated
    githubAuth.subscribe((authState) => {
      if (authState.isAuthenticated) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    });
  }

  // Subscribe to sync status changes
  subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
    listener(this.syncStatus);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  // Get current sync status
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Manual sync trigger
  async syncNow(gameState?: GameState): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, hasConflict: false, error: 'Device is offline' };
    }

    const authState = githubAuth.getAuthState();
    if (!authState.isAuthenticated) {
      return { success: false, hasConflict: false, error: 'Not authenticated with GitHub' };
    }

    this.updateStatus('syncing');

    try {
      const localState = gameState || loadGameState();
      if (!localState) {
        return { success: false, hasConflict: false, error: 'No local save found' };
      }

      // First, try to load remote save
      const remoteResult = await gistApi.loadFromGist();

      if (!remoteResult.success && remoteResult.error !== 'No save found in GitHub Gists') {
        // Error loading remote (network issue, etc.)
        this.updateStatus('error', remoteResult.error);
        return { success: false, hasConflict: false, error: remoteResult.error };
      }

      if (!remoteResult.data) {
        // No remote save exists, upload local save
        const uploadResult = await gistApi.saveToGist(localState);
        if (uploadResult.success) {
          this.updateStatus('idle');
          this.markSyncComplete();
          return { success: true, hasConflict: false };
        } else {
          this.updateStatus('error', uploadResult.error);
          return { success: false, hasConflict: false, error: uploadResult.error };
        }
      }

      // Both local and remote saves exist - check for conflicts
      const conflict = this.detectConflict(localState, remoteResult.data);

      if (conflict.hasConflict) {
        this.updateStatus('conflict', null, conflict.conflictData);
        return { success: false, hasConflict: true };
      }

      // No conflict - merge and save
      const mergedState = this.mergeGameStates(localState, remoteResult.data);

      // Save merged state both locally and remotely
      saveGameState(mergedState);
      const uploadResult = await gistApi.saveToGist(mergedState);

      if (uploadResult.success) {
        this.updateStatus('idle');
        this.markSyncComplete();
        return { success: true, hasConflict: false };
      } else {
        this.updateStatus('error', uploadResult.error);
        return { success: false, hasConflict: false, error: uploadResult.error };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      this.updateStatus('error', errorMessage);
      return { success: false, hasConflict: false, error: errorMessage };
    }
  }

  // Resolve conflict with chosen strategy
  async resolveConflict(strategy: SyncStrategy): Promise<SyncResult> {
    if (this.syncStatus.status !== 'conflict' || !this.syncStatus.conflictData) {
      return { success: false, hasConflict: false, error: 'No conflict to resolve' };
    }

    const { local, remote } = this.syncStatus.conflictData;
    let resolvedState: GameState;

    switch (strategy) {
      case 'prefer-remote':
        resolvedState = remote;
        break;
      case 'prefer-local':
        resolvedState = local;
        break;
      case 'merge-progressive':
        resolvedState = this.mergeProgressiveData(local, remote);
        break;
      default:
        return { success: false, hasConflict: false, error: 'Invalid resolution strategy' };
    }

    // Save resolved state
    saveGameState(resolvedState);
    const uploadResult = await gistApi.saveToGist(resolvedState);

    if (uploadResult.success) {
      this.updateStatus('idle');
      this.markSyncComplete();
      return { success: true, hasConflict: false };
    } else {
      this.updateStatus('error', uploadResult.error);
      return { success: false, hasConflict: false, error: uploadResult.error };
    }
  }

  // Start automatic sync
  private startAutoSync() {
    if (this.syncInterval) return;

    // Sync every 30 seconds
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.syncStatus.status === 'idle') {
        this.syncNow();
      }
    }, 30000);

    // Also sync immediately
    if (this.isOnline) {
      setTimeout(() => this.syncNow(), 1000);
    }
  }

  // Stop automatic sync
  private stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Detect conflicts between local and remote saves
  private detectConflict(local: GameState, remote: GameState): {
    hasConflict: boolean;
    conflictData?: SyncStatus['conflictData'];
  } {
    // Get timestamps from save metadata or fallback to character data
    const localTimestamp = this.getStateTimestamp(local);
    const remoteTimestamp = this.getStateTimestamp(remote);

    // If timestamps are very close (within 1 minute), no conflict
    if (Math.abs(new Date(localTimestamp).getTime() - new Date(remoteTimestamp).getTime()) < 60000) {
      return { hasConflict: false };
    }

    // Check for significant differences that indicate real conflicts
    const hasSignificantDifferences = (
      local.character.level !== remote.character.level ||
      Math.abs((local.character.xp || 0) - (remote.character.xp || 0)) > 1000 ||
      (local.analytics?.cycles?.length || 0) !== (remote.analytics?.cycles?.length || 0)
    );

    if (hasSignificantDifferences) {
      return {
        hasConflict: true,
        conflictData: {
          local,
          remote,
          localTimestamp,
          remoteTimestamp
        }
      };
    }

    return { hasConflict: false };
  }

  // Merge two game states (when no conflict)
  private mergeGameStates(local: GameState, remote: GameState): GameState {
    // Use the newer character progress
    const localTime = new Date(this.getStateTimestamp(local)).getTime();
    const remoteTime = new Date(this.getStateTimestamp(remote)).getTime();

    const newerState = localTime > remoteTime ? local : remote;
    const olderState = localTime > remoteTime ? remote : local;

    // Merge analytics (combine unique cycles)
    const mergedCycles = [
      ...(newerState.analytics?.cycles || []),
      ...(olderState.analytics?.cycles || []).filter(oldCycle =>
        !(newerState.analytics?.cycles || []).some(newCycle =>
          newCycle.startedAtISO === oldCycle.startedAtISO
        )
      )
    ].sort((a, b) => new Date(a.startedAtISO).getTime() - new Date(b.startedAtISO).getTime());

    return {
      ...newerState,
      analytics: {
        ...newerState.analytics,
        cycles: mergedCycles,
        mapResults: [
          ...(newerState.analytics?.mapResults || []),
          ...(olderState.analytics?.mapResults || []).filter(oldResult =>
            !(newerState.analytics?.mapResults || []).some(newResult =>
              newResult.endedAtISO === oldResult.endedAtISO
            )
          )
        ]
      }
    };
  }

  // Merge progressive data (always take the highest values)
  private mergeProgressiveData(local: GameState, remote: GameState): GameState {
    return {
      ...local,
      character: {
        ...local.character,
        level: Math.max(local.character.level, remote.character.level),
        xp: Math.max(local.character.xp || 0, remote.character.xp || 0)
      },
      gems: local.gems.map(localGem => {
        const remoteGem = remote.gems.find(g => g.id === localGem.id);
        if (!remoteGem) return localGem;

        return {
          ...localGem,
          level: Math.max(localGem.level, remoteGem.level),
          xp: Math.max(localGem.xp || 0, remoteGem.xp || 0)
        };
      }),
      currency: Object.keys({ ...local.currency, ...remote.currency }).reduce((acc, key) => {
        acc[key] = Math.max(local.currency?.[key] || 0, remote.currency?.[key] || 0);
        return acc;
      }, {} as Record<string, number>),
      analytics: this.mergeGameStates(local, remote).analytics
    };
  }

  // Get timestamp from game state
  private getStateTimestamp(state: GameState): string {
    // Try to get from latest analytics cycle
    const latestCycle = state.analytics?.cycles?.slice(-1)[0];
    if (latestCycle) {
      return latestCycle.endedAtISO || latestCycle.startedAtISO;
    }

    // Fallback to current time
    return new Date().toISOString();
  }

  // Update sync status and notify listeners
  private updateStatus(
    status: SyncStatus['status'],
    error?: string | null,
    conflictData?: SyncStatus['conflictData']
  ) {
    this.syncStatus = {
      ...this.syncStatus,
      status,
      lastError: error || null,
      conflictData
    };

    if (status === 'offline') {
      this.syncStatus.status = 'offline';
    }

    this.notifyListeners();
  }

  // Mark sync as complete
  private markSyncComplete() {
    this.syncStatus.lastSync = new Date().toISOString();
    localStorage.setItem('studyfall_last_sync', this.syncStatus.lastSync);
  }

  // Handle online event
  private handleOnline() {
    this.isOnline = true;
    if (this.syncStatus.status === 'offline') {
      this.updateStatus('idle');
      // Sync any pending changes
      if (this.pendingChanges) {
        this.syncNow(this.pendingChanges);
        this.pendingChanges = null;
      }
    }
  }

  // Handle offline event
  private handleOffline() {
    this.isOnline = false;
    this.updateStatus('offline');
  }

  // Queue changes for when back online
  queuePendingChanges(gameState: GameState) {
    this.pendingChanges = gameState;
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.syncStatus));
  }

  // Manual methods for debugging
  async forceUpload(gameState: GameState): Promise<SyncResult> {
    const result = await gistApi.saveToGist(gameState);
    if (result.success) {
      this.markSyncComplete();
      return { success: true, hasConflict: false };
    } else {
      return { success: false, hasConflict: false, error: result.error };
    }
  }

  async forceDownload(): Promise<SyncResult> {
    const result = await gistApi.loadFromGist();
    if (result.success && result.data) {
      saveGameState(result.data);
      this.markSyncComplete();
      return { success: true, hasConflict: false };
    } else {
      return { success: false, hasConflict: false, error: result.error };
    }
  }
}

// Export singleton instance
export const cloudSync = new CloudSyncService();
export type { SyncStatus, SyncResult, SyncStrategy };