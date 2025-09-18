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

  // Initiate GitHub Device Flow
  async login() {
    try {
      // Start device flow
      const deviceResponse = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          scope: GITHUB_SCOPES
        })
      });

      if (!deviceResponse.ok) {
        throw new Error('Failed to start device flow');
      }

      const deviceData = await deviceResponse.json();

      // Open GitHub authorization page
      window.open(deviceData.verification_uri, '_blank');

      // Show user the code they need to enter
      const userCode = deviceData.user_code;

      // Copy code to clipboard
      try {
        await navigator.clipboard.writeText(userCode);
        alert(`GitHub authorization opened in new tab.\n\nYour code: ${userCode}\n(Already copied to clipboard!)\n\nPaste this code on GitHub and click "Authorize"`);
      } catch {
        alert(`GitHub authorization opened in new tab.\n\nYour code: ${userCode}\n\nPaste this code on GitHub and click "Authorize"`);
      }

      // Poll for authorization
      this.pollForAuthorization(deviceData.device_code, deviceData.interval);

    } catch (error) {
      console.error('Device flow error:', error);
      alert('Failed to start GitHub authorization. Please try again.');
    }
  }

  // Poll GitHub for device authorization
  private async pollForAuthorization(deviceCode: string, interval: number) {
    const poll = async () => {
      try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          })
        });

        const data = await response.json();

        if (data.access_token) {
          // Success!
          await this.setAccessToken(data.access_token);
          alert('✅ Successfully connected to GitHub! Your saves are now backed up to the cloud.');
          return true;
        } else if (data.error === 'authorization_pending') {
          // User hasn't authorized yet, continue polling
          return false;
        } else if (data.error === 'slow_down') {
          // GitHub wants us to slow down polling
          interval = interval * 2;
          return false;
        } else {
          // Other error
          throw new Error(data.error_description || data.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Polling error:', error);
        alert('Authorization failed. Please try again.');
        return true; // Stop polling
      }
    };

    // Poll every interval seconds
    const pollInterval = setInterval(async () => {
      const shouldStop = await poll();
      if (shouldStop) {
        clearInterval(pollInterval);
      }
    }, interval * 1000);

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 600000);
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