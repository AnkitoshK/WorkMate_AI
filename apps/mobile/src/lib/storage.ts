// Universal session storage for React Native (Expo Web & Mobile)
import { MobileUser } from './api';

let memoryCache: Record<string, string> = {};

export const storage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return memoryCache[key] ?? null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {}
    memoryCache[key] = value;
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    delete memoryCache[key];
  },
};

const USER_SESSION_KEY = "workmate_mobile_user_session_payload";

export async function getActiveUserSession(): Promise<MobileUser | null> {
  const raw = storage.getItem(USER_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MobileUser;
  } catch {
    return null;
  }
}

export function setActiveUserSession(user: MobileUser): void {
  storage.setItem(USER_SESSION_KEY, JSON.stringify(user));
}

export function clearActiveUserSession(): void {
  storage.removeItem(USER_SESSION_KEY);
}

export type { MobileUser };
