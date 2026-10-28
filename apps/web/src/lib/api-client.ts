import { ApiResponse } from '@mivo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('mivo_access_token', token);
      } else {
        localStorage.removeItem('mivo_access_token');
      }
    }
  }

  getAccessToken(): string | null {
    if (this.accessToken) return this.accessToken;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mivo_access_token');
      if (stored) {
        this.accessToken = stored;
        return stored;
      }
    }
    return null;
  }

  async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          const json = await res.json();
          const newToken = json.data?.accessToken;
          if (newToken) {
            this.setAccessToken(newToken);
            return newToken;
          }
        }
      } catch (err) {
        console.warn('Silent token refresh failed:', err);
      } finally {
        this.refreshPromise = null;
      }
      return null;
    })();

    return this.refreshPromise;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      let response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      // Handle 401 Unauthorized by attempting a token refresh (except for auth endpoints)
      const isAuthEndpoint =
        endpoint.includes('/auth/login') ||
        endpoint.includes('/auth/register') ||
        endpoint.includes('/auth/refresh');

      if (response.status === 401 && !isAuthEndpoint) {
        const newToken = await this.refreshToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          });
        }
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'REQUEST_FAILED',
            message: data.message || `HTTP error ${response.status}`,
          },
        };
      }

      return data as ApiResponse<T>;
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err.message || 'Unable to connect to Mivo servers',
        },
      };
    }
  }

  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
