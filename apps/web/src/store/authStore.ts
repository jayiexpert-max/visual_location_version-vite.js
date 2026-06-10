import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SupportedLanguage, UserRole } from '@visual-location/shared';
import type { AuthUser } from '../types/api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: AuthUser | null;
  deviceType: 'desktop' | 'handheld' | 'tv';
  setAuth: (
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    user: AuthUser,
  ) => void;
  setTokens: (accessToken: string, refreshToken: string, expiresIn: number) => void;
  setUser: (user: AuthUser) => void;
  setLang: (lang: SupportedLanguage) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      deviceType: 'desktop',

      setAuth: (accessToken, refreshToken, expiresIn, user) =>
        set({
          accessToken,
          refreshToken,
          expiresAt: Date.now() + expiresIn * 1000,
          user,
        }),

      setTokens: (accessToken, refreshToken, expiresIn) =>
        set({
          accessToken,
          refreshToken,
          expiresAt: Date.now() + expiresIn * 1000,
        }),

      setUser: (user) => set({ user }),

      setLang: (lang) =>
        set((state) => ({
          user: state.user ? { ...state.user, lang } : null,
        })),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          user: null,
        }),

      isAuthenticated: () => {
        const { accessToken, expiresAt } = get();
        return Boolean(accessToken && expiresAt && Date.now() < expiresAt);
      },

      hasRole: (...roles) => {
        const user = get().user;
        return user ? roles.includes(user.role) : false;
      },
    }),
    {
      name: 'visual-location-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        user: state.user,
        deviceType: state.deviceType,
      }),
    },
  ),
);
