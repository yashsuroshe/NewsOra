import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User {
  _id: string;
  name: string;
  email: string;
  preferences: {
    topics: string[];
    frequency: string;
    alertThreshold: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokenFromOAuth: (token: string) => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post<{ data: { user: User; accessToken: string } }>(
            '/auth/login',
            { email, password },
          );
          const { user, accessToken } = res.data.data;
          localStorage.setItem('access_token', accessToken);
          set({ user, accessToken, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post<{ data: { user: User; accessToken: string } }>(
            '/auth/register',
            { name, email, password },
          );
          const { user, accessToken } = res.data.data;
          localStorage.setItem('access_token', accessToken);
          set({ user, accessToken, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } finally {
          localStorage.removeItem('access_token');
          set({ user: null, accessToken: null });
        }
      },

      setTokenFromOAuth: (token: string) => {
        localStorage.setItem('access_token', token);
        set({ accessToken: token });
        void get().fetchMe();
      },

      fetchMe: async () => {
        try {
          const res = await api.get<{ data: User }>('/auth/me');
          set({ user: res.data.data });
        } catch {
          set({ user: null, accessToken: null });
          localStorage.removeItem('access_token');
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ accessToken: state.accessToken }),
    },
  ),
);
