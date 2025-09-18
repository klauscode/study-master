import type { GameState } from '../types/gameTypes';
import { githubAuth } from './githubAuthService';

interface GistFile {
  filename: string;
  content: string;
  type: string;
}

interface Gist {
  id: string;
  description: string;
  public: boolean;
  files: Record<string, GistFile>;
  created_at: string;
  updated_at: string;
  html_url: string;
}

interface SaveMetadata {
  timestamp: string;
  version: number;
  device: string;
  characterLevel: number;
  totalStudyTime: number;
  gameVersion: string;
}

interface StudyFallSave {
  metadata: SaveMetadata;
  gameState: GameState;
}

class GistApiService {
  private readonly SAVE_GIST_DESCRIPTION = 'StudyFall Game Save Data';
  private readonly SAVE_FILENAME = 'studyfall-save.json';
  private saveGistId: string | null = null;

  constructor() {
    // Load saved gist ID
    this.saveGistId = localStorage.getItem('studyfall_save_gist_id');
  }

  // Create or update save in GitHub Gist
  async saveToGist(gameState: GameState): Promise<{ success: boolean; error?: string }> {
    const authState = githubAuth.getAuthState();
    if (!authState.isAuthenticated || !authState.accessToken) {
      return { success: false, error: 'Not authenticated with GitHub' };
    }

    try {
      const saveData: StudyFallSave = {
        metadata: this.generateSaveMetadata(gameState),
        gameState
      };

      const fileContent = JSON.stringify(saveData, null, 2);

      if (this.saveGistId) {
        // Update existing gist
        return await this.updateGist(this.saveGistId, fileContent, authState.accessToken);
      } else {
        // Create new gist
        return await this.createGist(fileContent, authState.accessToken);
      }

    } catch (error) {
      console.error('Failed to save to gist:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Load save from GitHub Gist
  async loadFromGist(): Promise<{ success: boolean; data?: GameState; error?: string }> {
    const authState = githubAuth.getAuthState();
    if (!authState.isAuthenticated || !authState.accessToken) {
      return { success: false, error: 'Not authenticated with GitHub' };
    }

    if (!this.saveGistId) {
      // Try to find existing save gist
      const findResult = await this.findSaveGist(authState.accessToken);
      if (!findResult.success) {
        return { success: false, error: 'No save found in GitHub Gists' };
      }
    }

    try {
      const gist = await this.fetchGist(this.saveGistId!, authState.accessToken);
      if (!gist) {
        return { success: false, error: 'Save gist not found' };
      }

      const saveFile = gist.files[this.SAVE_FILENAME];
      if (!saveFile) {
        return { success: false, error: 'Save file not found in gist' };
      }

      const saveData: StudyFallSave = JSON.parse(saveFile.content);

      // Validate save data
      if (!this.validateSaveData(saveData)) {
        return { success: false, error: 'Invalid save data format' };
      }

      return { success: true, data: saveData.gameState };

    } catch (error) {
      console.error('Failed to load from gist:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to parse save data' };
    }
  }

  // Get all save versions (gist commits)
  async getSaveHistory(): Promise<{ success: boolean; history?: SaveMetadata[]; error?: string }> {
    const authState = githubAuth.getAuthState();
    if (!authState.isAuthenticated || !authState.accessToken || !this.saveGistId) {
      return { success: false, error: 'Not authenticated or no save found' };
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${this.saveGistId}/commits`, {
        headers: {
          'Authorization': `Bearer ${authState.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch save history: ${response.statusText}`);
      }

      const commits = await response.json();
      const history: SaveMetadata[] = [];

      // For each commit, we'd need to fetch the gist at that revision to get metadata
      // For now, return basic commit info
      for (const commit of commits.slice(0, 10)) { // Last 10 versions
        history.push({
          timestamp: commit.committed_at,
          version: 1, // Would need to parse from actual save
          device: 'Unknown',
          characterLevel: 0,
          totalStudyTime: 0,
          gameVersion: '1.0.0'
        });
      }

      return { success: true, history };

    } catch (error) {
      console.error('Failed to get save history:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Create new gist for save data
  private async createGist(content: string, accessToken: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: this.SAVE_GIST_DESCRIPTION,
        public: false,
        files: {
          [this.SAVE_FILENAME]: {
            content: content
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create gist: ${response.statusText}`);
    }

    const gist: Gist = await response.json();
    this.saveGistId = gist.id;
    localStorage.setItem('studyfall_save_gist_id', gist.id);

    return { success: true };
  }

  // Update existing gist
  private async updateGist(gistId: string, content: string, accessToken: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          [this.SAVE_FILENAME]: {
            content: content
          }
        }
      })
    });

    if (!response.ok) {
      // If gist not found, try creating a new one
      if (response.status === 404) {
        this.saveGistId = null;
        localStorage.removeItem('studyfall_save_gist_id');
        return await this.createGist(content, accessToken);
      }
      throw new Error(`Failed to update gist: ${response.statusText}`);
    }

    return { success: true };
  }

  // Fetch gist by ID
  private async fetchGist(gistId: string, accessToken: string): Promise<Gist | null> {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Gist not found, clear saved ID
        this.saveGistId = null;
        localStorage.removeItem('studyfall_save_gist_id');
      }
      return null;
    }

    return await response.json();
  }

  // Find existing save gist
  private async findSaveGist(accessToken: string): Promise<{ success: boolean; gistId?: string }> {
    const response = await fetch('https://api.github.com/gists', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch gists: ${response.statusText}`);
    }

    const gists: Gist[] = await response.json();

    // Look for our save gist
    const saveGist = gists.find(gist =>
      gist.description === this.SAVE_GIST_DESCRIPTION &&
      gist.files[this.SAVE_FILENAME]
    );

    if (saveGist) {
      this.saveGistId = saveGist.id;
      localStorage.setItem('studyfall_save_gist_id', saveGist.id);
      return { success: true, gistId: saveGist.id };
    }

    return { success: false };
  }

  // Generate save metadata
  private generateSaveMetadata(gameState: GameState): SaveMetadata {
    const totalStudyTime = (gameState.analytics?.cycles || [])
      .reduce((total, cycle) => total + cycle.studySeconds, 0);

    return {
      timestamp: new Date().toISOString(),
      version: 1,
      device: this.getDeviceInfo(),
      characterLevel: gameState.character?.level || 1,
      totalStudyTime: Math.round(totalStudyTime / 60), // in minutes
      gameVersion: '1.0.0'
    };
  }

  // Get device/browser info
  private getDeviceInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  }

  // Validate save data structure
  private validateSaveData(data: any): data is StudyFallSave {
    return (
      data &&
      typeof data === 'object' &&
      data.metadata &&
      data.gameState &&
      typeof data.metadata.timestamp === 'string' &&
      typeof data.metadata.version === 'number'
    );
  }

  // Get current save gist URL for sharing
  getSaveUrl(): string | null {
    if (!this.saveGistId) return null;
    return `https://gist.github.com/${this.saveGistId}`;
  }

  // Clear saved gist ID (for testing or reset)
  clearSaveGist() {
    this.saveGistId = null;
    localStorage.removeItem('studyfall_save_gist_id');
  }
}

// Export singleton instance
export const gistApi = new GistApiService();
export type { SaveMetadata, StudyFallSave };