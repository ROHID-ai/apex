import { create } from 'zustand';

export type UserRole = 'admin' | 'member';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  plan?: string;
  status?: string;
  join_date?: string;
  membership_id?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

const USER_KEY = 'user';
const TOKEN_KEY = 'token';

const readStoredJson = <T>(key: string): T | null => {
  const fromLocal = localStorage.getItem(key);
  if (fromLocal) {
    return JSON.parse(fromLocal) as T;
  }

  const fromSession = sessionStorage.getItem(key);
  if (fromSession) {
    localStorage.setItem(key, fromSession);
    return JSON.parse(fromSession) as T;
  }

  return null;
};

const readStoredToken = () => {
  const fromLocal = localStorage.getItem(TOKEN_KEY);
  if (fromLocal) {
    return fromLocal;
  }

  const fromSession = sessionStorage.getItem(TOKEN_KEY);
  if (fromSession) {
    localStorage.setItem(TOKEN_KEY, fromSession);
    return fromSession;
  }

  return null;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: readStoredJson<User>(USER_KEY),
  token: readStoredToken(),
  setAuth: (user, token) => {
    const userPayload = JSON.stringify(user);
    localStorage.setItem(USER_KEY, userPayload);
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, userPayload);
    sessionStorage.setItem(TOKEN_KEY, token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null });
  },
}));
