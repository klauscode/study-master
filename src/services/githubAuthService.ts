interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string;
}

interface GitHubAuthState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  accessToken: string | null;
}

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = 'Ov23licaI4rewEl0nGCw'; // User will need to set this up
const GITHUB_SCOPES = 'gist';
const GITHUB_REDIRECT_URI = window.location.origin + '/auth/github/callback';

class GitHubAuthService {
  private state: GitHubAuthState = {
    isAuthenticated: false,
    user: null,
    accessToken: null
  };

  private listeners: ((state: GitHubAuthState) => void)[] = [];

  constructor() {
    // Load saved auth state
    this.loadAuthState();
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: GitHubAuthState) => void) {
    this.listeners.push(listener);
    listener(this.state); // Immediately call with current state

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  // Get current auth state
  getAuthState(): GitHubAuthState {
    return { ...this.state };
  }

  // Personal Access Token login (CORS-free)
  async login() {
    const instructions = `To enable cloud saves, you need to create a GitHub Personal Access Token:

1. Go to: https://github.com/settings/tokens/new
2. Token description: "StudyFall Cloud Saves"
3. Expiration: Choose your preference (90 days or longer)
4. Select scopes: ✅ Check "gist" only
5. Click "Generate token"
6. Copy the token (starts with ghp_...)

⚠️ Important: Keep this token safe! It's like a password.`;

    const token = prompt(instructions + '\n\nPaste your GitHub token here:');

    if (!token) {
      return; // User cancelled
    }

    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      alert('❌ Invalid token format. GitHub tokens start with "ghp_" or "github_pat_"');
      return;
    }

    try {
      // Test the token by fetching user data
      await this.setAccessToken(token);
      alert('✅ Successfully connected to GitHub! Your saves are now backed up to the cloud.');
    } catch (error) {
      console.error('Token validation failed:', error);
      alert('❌ Invalid token or insufficient permissions. Please make sure:\n- Token is valid\n- "gist" scope is enabled\n- Token is not expired');
    }
  }

  // Logout and clear auth state
  logout() {
    this.state = {
      isAuthenticated: false,
      user: null,
      accessToken: null
    };

    localStorage.removeItem('github_auth_token');
    localStorage.removeItem('github_user_data');
    localStorage.removeItem('github_oauth_state');

    this.notifyListeners();
  }


  // Set access token and fetch user data
  private async setAccessToken(token: string) {
    this.state.accessToken = token;

    try {
      // Fetch user data
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await userResponse.json();
      this.state.user = userData;
      this.state.isAuthenticated = true;

      // Save auth state
      localStorage.setItem('github_auth_token', token);
      localStorage.setItem('github_user_data', JSON.stringify(userData));

      this.notifyListeners();

    } catch (error) {
      console.error('Failed to fetch user data:', error);
      this.logout();
      throw error;
    }
  }

  // Load saved auth state from localStorage
  private loadAuthState() {
    const token = localStorage.getItem('github_auth_token');
    const userDataStr = localStorage.getItem('github_user_data');

    if (token && userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        this.state = {
          isAuthenticated: true,
          user: userData,
          accessToken: token
        };
      } catch (error) {
        console.error('Failed to load auth state:', error);
        this.logout();
      }
    }
  }

  // Generate random state for OAuth security
  private generateRandomState(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  // Notify all listeners of state changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Check if user has gist permissions
  async checkGistPermissions(): Promise<boolean> {
    if (!this.state.accessToken) return false;

    try {
      // Try to fetch user's gists to test permissions
      const response = await fetch('https://api.github.com/gists?per_page=1', {
        headers: {
          'Authorization': `Bearer ${this.state.accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const githubAuth = new GitHubAuthService();
export type { GitHubAuthState, GitHubUser };