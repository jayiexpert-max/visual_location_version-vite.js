import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage, UserRole } from '@visual-location/shared';
import { canAccessMenu, type MenuKey } from '@visual-location/shared';
import * as authService from '../services/authService';
import { useAuthStore } from '../store/authStore';
import type { AuthUser } from '../types/api';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changeLanguage: (lang: SupportedLanguage) => Promise<void>;
  canAccess: (menu: MenuKey) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const {
    user,
    accessToken,
    expiresAt,
    setAuth,
    setUser,
    setLang,
    logout: clearAuth,
    hasRole,
  } = useAuthStore();

  const isAuthenticated = Boolean(accessToken && expiresAt && Date.now() < expiresAt);

  useEffect(() => {
    if (user?.lang) {
      void i18n.changeLanguage(user.lang);
    }
  }, [user?.lang, i18n]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      const state = useAuthStore.getState();
      if (state.expiresAt && Date.now() >= state.expiresAt) {
        clearAuth();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, clearAuth]);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await authService.login(username, password, 'desktop');
      setAuth(result.accessToken, result.refreshToken, result.expiresIn, result.user);
      await i18n.changeLanguage(result.user.lang);
    },
    [setAuth, i18n],
  );

  const logout = useCallback(async () => {
    try {
      if (isAuthenticated) await authService.logout();
    } finally {
      clearAuth();
    }
  }, [isAuthenticated, clearAuth]);

  const changeLanguage = useCallback(
    async (lang: SupportedLanguage) => {
      if (isAuthenticated) {
        const updated = await authService.updateMe({ lang });
        setUser(updated);
      } else {
        setLang(lang);
      }
      await i18n.changeLanguage(lang);
    },
    [isAuthenticated, setUser, setLang, i18n],
  );

  const canAccess = useCallback(
    (menu: MenuKey) => (user ? canAccessMenu(user.role, menu) : false),
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      login,
      logout,
      changeLanguage,
      canAccess,
      hasRole,
    }),
    [user, isAuthenticated, login, logout, changeLanguage, canAccess, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
