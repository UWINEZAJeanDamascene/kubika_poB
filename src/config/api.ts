import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { API_BASE_URL } from '@/lib/apiBase';

// API Error codes
export const ERROR_CODES = {
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  COMPANY_INACTIVE: 'COMPANY_INACTIVE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// API Error interface
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

// Backend response error structure
interface BackendErrorResponse {
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

// Track if we're currently refreshing the token to prevent multiple refresh calls
let isRefreshing = false;
// Queue of requests waiting for token refresh
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

// Process the queue of failed requests
const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Get fresh state from store (using getState for synchronous access)
const getAuthState = () => {
  const state = useAuthStore.getState();
  return {
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    activeCompanyId: state.activeCompanyId,
    activeRole: state.activeRole,
  };
};

// Request interceptor: Attach Authorization and Company ID
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken, activeCompanyId, activeRole } = getAuthState();
    
    // Attach Authorization header if token exists
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    // Attach X-Company-Id header if active company exists
    if (activeCompanyId) {
      config.headers['X-Company-Id'] = activeCompanyId;
    }
    
    // Attach X-User-Role header if active role exists
    if (activeRole) {
      config.headers['X-User-Role'] = activeRole;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle token refresh, auth errors, and company status
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<BackendErrorResponse>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Accept both the structured error envelope and the flat legacy code
      // used by older backend deployments.
      const errorCode =
        error.response.data?.error?.code ||
        (error.response.data as { code?: string } | undefined)?.code ||
        ERROR_CODES.UNAUTHORIZED;
      
      // Handle TOKEN_EXPIRED - try to refresh token
      if (errorCode === ERROR_CODES.TOKEN_EXPIRED) {
        // If already retrying, add to queue
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }
        
        // Mark original request as retry
        originalRequest._retry = true;
        isRefreshing = true;
        
        const { refreshToken } = getAuthState();
        
        // If no refresh token, can't refresh
        if (!refreshToken) {
          processQueue(error, null);
          handleAuthFailure();
          return Promise.reject(createApiError(ERROR_CODES.TOKEN_EXPIRED, 'Session expired. Please login again.'));
        }
        
        try {
          // Call refresh token endpoint
          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            { refresh_token: refreshToken },
            { withCredentials: true }
          );
          
          const {
            access_token: accessToken,
            refresh_token: newRefreshToken,
          } = response.data as {
            access_token?: string;
            refresh_token?: string;
          };

          if (!accessToken || !newRefreshToken) {
            throw new Error('Refresh response did not contain a complete token pair');
          }

          // Update tokens in store
          useAuthStore.getState().refreshTokens(accessToken, newRefreshToken);

          // Process queued requests
          processQueue(null, accessToken);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, reject all queued requests
          processQueue(refreshError, null);
          handleAuthFailure();
          return Promise.reject(createApiError(ERROR_CODES.TOKEN_EXPIRED, 'Session expired. Please login again.'));
        } finally {
          isRefreshing = false;
        }
      }
      
      // If it's a regular 401 (not expired token), clear auth state
      handleAuthFailure();
      return Promise.reject(createApiError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized. Please login.'));
    }
    
    // Handle 403 Forbidden - Company Inactive
    if (error.response?.status === 403) {
      const errorCode = error.response.data?.error?.code || ERROR_CODES.FORBIDDEN;
      
      if (errorCode === ERROR_CODES.COMPANY_INACTIVE) {
        // Redirect to company selector
        window.location.href = '/company-select';
        return Promise.reject(createApiError(ERROR_CODES.COMPANY_INACTIVE, 'Your company account is inactive.'));
      }
      
      return Promise.reject(createApiError(ERROR_CODES.FORBIDDEN, 'Access forbidden.'));
    }
    
    // Handle other errors
    return Promise.reject(parseError(error));
  }
);

// Helper function to handle auth failure - clear state and redirect
const handleAuthFailure = () => {
  useAuthStore.getState().logout();
  window.location.href = '/login';
};

// Helper function to create API error object
const createApiError = (code: ErrorCode, message: string): ApiError => ({
  code,
  message,
});

// Helper function to parse error from response
const parseError = (error: AxiosError<BackendErrorResponse>): ApiError => {
  // Network errors
  if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
    return createApiError(ERROR_CODES.NETWORK_ERROR, 'Network error. Please check your connection.');
  }
  
  // Server errors (5xx)
  if (error.response?.status && error.response.status >= 500) {
    return createApiError(ERROR_CODES.SERVER_ERROR, 'Server error. Please try again later.');
  }
  
  // Try to extract error from response
  const backendError = error.response?.data?.error;
  if (backendError) {
    return {
      code: backendError.code as ErrorCode,
      message: backendError.message,
    };
  }
  
  // Fallback to response message or generic error
  const message = error.response?.data?.message || error.message || 'An unexpected error occurred.';
  return createApiError(ERROR_CODES.SERVER_ERROR, message);
};

// API client methods
export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    api.get<T>(url, config).then((res) => res.data),
  
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.post<T>(url, data, config).then((res) => res.data),
  
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.put<T>(url, data, config).then((res) => res.data),
  
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    api.patch<T>(url, data, config).then((res) => res.data),
  
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T>(url, config).then((res) => res.data),
  
  // Expose the raw axios instance for special cases
  instance: api,
};

export default apiClient;
