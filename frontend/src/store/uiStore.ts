import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PaletteMode } from '@mui/material';

interface UiState {
  sidebarOpen: boolean;
  themeMode: PaletteMode;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setThemeMode: (mode: PaletteMode) => void;
  toggleThemeMode: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      themeMode: 'light',

      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      toggleThemeMode: () =>
        set({ themeMode: get().themeMode === 'dark' ? 'light' : 'dark' }),
    }),
    { name: 'visual-location-ui' },
  ),
);
