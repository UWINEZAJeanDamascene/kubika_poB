import { authApi, Membership } from '@/lib/api';
import { API_BASE_URL } from '@/lib/apiBase';

// Types matching backend response
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

// Backend response types - matching new format
export interface AuthResponse {
  success: boolean;
  token: string;
  access_token: string;
  refresh_token: string;
  userId: string;
  memberships: Membership[];
}

export interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  company?: string;
  lastLogin?: string;
  mustChangePassword?: boolean;
}

// Auth service using real API
const authService = {
  /**
   * Login with email and password
   * Calls POST /auth/login
   */
  async login(credentials: LoginCredentials): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    lockedUntil?: number;
    user?: UserData;
    token?: string;
    refreshToken?: string;
    userId?: string;
    memberships?: Membership[];
    requirePasswordChange?: boolean;
  }> {
    try {
      const response = await authApi.login(credentials.email, credentials.password);
      
      if (!response.success) {
        return { success: false, error: 'Login failed' };
      }
      
      // Backend returns: { success, token, access_token, refresh_token, userId, memberships }
      // Use access_token as the primary token
      return {
        success: true,
        token: response.access_token || response.token,
        refreshToken: response.refresh_token,
        userId: response.userId,
        user: response.user as UserData | undefined,
        memberships: response.memberships,
      };
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; lockedUntil?: number };
      // Handle specific error codes from backend
      if (err.code === 'INVALID_CREDENTIALS') {
        return { success: false, error: 'Invalid email or password', errorCode: 'INVALID_CREDENTIALS' };
      }
      if (err.code === 'ACCOUNT_LOCKED') {
        return { 
          success: false, 
          error: 'Account is locked', 
          errorCode: 'ACCOUNT_LOCKED',
          lockedUntil: err.lockedUntil 
        };
      }
      const errorMessage = err.message || 'Login failed';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Register new user
   * Calls POST /auth/register
   */
  async register(data: RegisterData): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    token?: string;
  }> {
    try {
      const response = await authApi.register(
        data.name,
        data.email,
        data.password,
        data.role
      );
      
      if (!response.success) {
        // Check for specific error codes
        const err = response as { code?: string; message?: string };
        if (err.code === 'EMAIL_ALREADY_REGISTERED') {
          return { success: false, error: 'Email already registered', errorCode: 'EMAIL_ALREADY_REGISTERED' };
        }
        return { success: false, error: err.message || 'Registration failed' };
      }
      
      return {
        success: true,
        token: response.token,
      };
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'EMAIL_ALREADY_REGISTERED') {
        return { success: false, error: 'Email already registered', errorCode: 'EMAIL_ALREADY_REGISTERED' };
      }
      const errorMessage = err.message || 'Registration failed';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Get current user info
   * Calls GET /auth/me
   */
  async getMe(): Promise<{ success: boolean; data?: UserData; error?: string }> {
    try {
      const response = await authApi.getMe();
      
      if (!response.success) {
        return { success: false, error: 'Failed to get user info' };
      }
      
      return {
        success: true,
        data: response.data as unknown as UserData,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get user info';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Logout current user
   * Calls POST /auth/logout
   */
  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  /**
   * Update password
   * Calls PUT /auth/update-password
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      const response = await authApi.updatePassword(currentPassword, newPassword);
      
      if (!response.success) {
        return { success: false, error: response.message || 'Password update failed' };
      }
      
      return {
        success: true,
        message: response.message,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Password update failed';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Forgot password - send reset email
   * Calls POST /auth/forgot-password
   */
  async forgotPassword(email: string): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        return { success: false, error: data.message || 'Failed to send reset email' };
      }
      
      return {
        success: true,
        message: data.message,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Check if platform admin setup is needed
   * Calls GET /auth/platform-admin-status
   */
  async checkPlatformAdminStatus(): Promise<{ success: boolean; needsSetup?: boolean; error?: string }> {
    try {
      const response = await authApi.checkPlatformAdminStatus();
      return {
        success: true,
        needsSetup: response.needsSetup,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check setup status';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Setup the first platform admin
   * Calls POST /auth/setup-platform-admin
   */
  async setupPlatformAdmin(setupKey: string, name: string, email: string, password: string): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    message?: string;
  }> {
    try {
      const response = await authApi.setupPlatformAdmin(setupKey, name, email, password);
      return {
        success: true,
        message: response.message,
      };
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'INVALID_SETUP_KEY') {
        return { success: false, error: 'Invalid setup key', errorCode: 'INVALID_SETUP_KEY' };
      }
      if (err.code === 'PASSWORD_TOO_SHORT') {
        return { success: false, error: 'Password must be at least 8 characters', errorCode: 'PASSWORD_TOO_SHORT' };
      }
      if (err.code === 'PLATFORM_ADMIN_ALREADY_EXISTS') {
        return { success: false, error: 'Platform admin already exists', errorCode: 'PLATFORM_ADMIN_ALREADY_EXISTS' };
      }
      const errorMessage = err.message || 'Setup failed';
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Reset password with token
   * Calls POST /auth/reset-password (token in body, not URL)
   */
  async resetPassword(token: string, newPassword: string): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    message?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        // Check for specific error codes
        if (data.code === 'INVALID_OR_EXPIRED_TOKEN') {
          return { success: false, error: data.message || 'Invalid or expired token', errorCode: 'INVALID_OR_EXPIRED_TOKEN' };
        }
        if (data.code === 'PASSWORD_TOO_SHORT') {
          return { success: false, error: data.message || 'Password too short', errorCode: 'PASSWORD_TOO_SHORT' };
        }
        return { success: false, error: data.message || 'Failed to reset password' };
      }
      
      return {
        success: true,
        message: data.message,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      return { success: false, error: errorMessage };
    }
  },
};

export default authService;
