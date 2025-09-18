import type { GameState } from '../types/gameTypes';

const SAVE_KEY = 'studyfall.save.v1';
const CURRENT_VERSION = 1;

export function saveGameState(state: GameState) {
  const payload = { ...state, saveVersion: CURRENT_VERSION };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));

  // Trigger cloud sync if available (lazy import to avoid circular deps)
  if (typeof window !== 'undefined') {
    import('./cloudSyncService').then(({ cloudSync }) => {
      cloudSync.queuePendingChanges(payload);
    }).catch(() => {
      // Cloud sync not available or failed - that's OK
    });
  }
}

export function loadGameState(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return migrateSave(data);
  } catch {
    return null;
  }
}

function migrateSave(data: any): GameState | null {
  // For now, simple pass-through if version matches; future: add migrations here
  if (typeof data !== 'object' || data == null) return null;
  if (data.saveVersion !== CURRENT_VERSION) {
    // Example migration hook
    // data = migrateFromVersionX(data);
  }
  return data as GameState;
}

export function resetGameState() {
  localStorage.removeItem(SAVE_KEY);
}
