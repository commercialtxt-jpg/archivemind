import { create } from 'zustand';
import api from '../lib/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  /** Internal: set token + user into state and localStorage */
  setAuth: (token: string, user: User) => void;

  /** Call the login API and persist the result */
  login: (email: string, password: string) => Promise<void>;

  /** Call the register API and persist the result */
  register: (email: string, password: string, displayName: string) => Promise<void>;

  /** Clear token and user from state + localStorage */
  logout: () => void;

  /** Rehydrate auth state from localStorage on app startup */
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  login: async (email, password) => {
    const { data } = await api.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    // Response is flat { token, user } — NOT wrapped in { data: ... }
    const token = data.token;
    const user = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  register: async (email, password, displayName) => {
    const { data } = await api.post<{ token: string; user: User }>('/auth/register', {
      email,
      password,
      display_name: displayName,
    });
    const token = data.token;
    const user = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ token, user, isAuthenticated: true });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  },
}));
