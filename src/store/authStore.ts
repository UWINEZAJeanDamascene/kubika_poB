import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types matching backend response
export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  company?: string;
  avatar?: string;
  phone?: string;
  jobTitle?: string;
  bio?: string;
  isActive?: boolean;
  lastLogin?: string;
  mustChangePassword?: boolean;
  permissions?: string[];
}

export interface Company {
  _id: string;
  id?: string;
  name: string;
  email?: string;
  logo_url?: string;
  isActive?: boolean;
  approvalStatus?: string;
}

// Membership from login response
export interface Membership {
  companyId: string;
  role: string;
}

interface AuthState {
  // Auth data - matching backend response
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  
  // Multi-tenancy - from memberships
  companies: Membership[];
  activeCompanyId: string | null;
  activeRole: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setCompanies: (companies: Membership[]) => void;
  setActiveCompany: (companyId: string, role: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Auth actions
  login: (
    user: User, 
    accessToken: string, 
    refreshToken: string, 
    memberships: Membership[]
  ) => void;
  logout: () => void;
  refreshTokens: (newAccessToken: string, newRefreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      
      // Multi-tenancy
      companies: [],
      activeCompanyId: null,
      activeRole: null,
      
      setUser: (user) => set({ user }),
      setAccessToken: (accessToken) => set({ 
        accessToken, 
        isAuthenticated: !!accessToken 
      }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setCompanies: (companies) => set({ companies }),
      
      setActiveCompany: (companyId, role) => set({ 
        activeCompanyId: companyId,
        activeRole: role 
      }),
      
      setLoading: (loading) => set({ loading }),
      
      login: (user, accessToken, refreshToken, memberships) => {
        // Set first company as active if multiple
        const activeCompany = memberships[0] || null;

        // Keep legacy consumers and the persisted Zustand state on the same
        // token. This prevents a request between login and store hydration
        // from falling back to yesterday's access token.
        try {
          localStorage.setItem('token', accessToken);
          if (activeCompany?.companyId) {
            localStorage.setItem('companyId', activeCompany.companyId);
          } else {
            localStorage.removeItem('companyId');
          }
        } catch {
          // Storage can be unavailable in private browsing; Zustand remains
          // the authoritative in-memory source for this session.
        }

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          companies: memberships,
          activeCompanyId: activeCompany?.companyId || null,
          activeRole: activeCompany?.role || null,
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          companies: [],
          activeCompanyId: null,
          activeRole: null,
        });

        // Remove both legacy keys and the persisted snapshot. The persist
        // middleware will recreate a clean snapshot on the next state write.
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('companyId');
          localStorage.removeItem('auth-storage');
        } catch {
          // Storage can be unavailable in private browsing.
        }
      },

      refreshTokens: (newAccessToken, newRefreshToken) => {
        try {
          localStorage.setItem('token', newAccessToken);
        } catch {
          // Zustand still keeps the refreshed token in memory.
        }
        set({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          isAuthenticated: true,
        });
      },
      
      updateUser: (userData) => {
        const currentUser = get().user;
        set({ user: currentUser ? { ...currentUser, ...userData } : null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        companies: state.companies,
        activeCompanyId: state.activeCompanyId,
        activeRole: state.activeRole,
      }),
    }
  )
);

// Selectors
export const selectToken = (state: AuthState) => state.accessToken;
export const selectRefreshToken = (state: AuthState) => state.refreshToken;
export const selectActiveCompany = (state: AuthState) => state.activeCompanyId;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectUser = (state: AuthState) => state.user;
export const selectCompanies = (state: AuthState) => state.companies;
export const selectActiveRole = (state: AuthState) => state.activeRole;
