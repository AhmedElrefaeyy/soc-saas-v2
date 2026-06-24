import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  notificationCenterOpen: boolean;
  shortcutsModalOpen: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openNotificationCenter: () => void;
  closeNotificationCenter: () => void;
  toggleNotificationCenter: () => void;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
  toggleShortcutsModal: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      notificationCenterOpen: false,
      shortcutsModalOpen: false,

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      toggleCommandPalette: () =>
        set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

      openNotificationCenter: () => set({ notificationCenterOpen: true }),
      closeNotificationCenter: () => set({ notificationCenterOpen: false }),
      toggleNotificationCenter: () =>
        set((s) => ({ notificationCenterOpen: !s.notificationCenterOpen })),

      openShortcutsModal: () => set({ shortcutsModalOpen: true }),
      closeShortcutsModal: () => set({ shortcutsModalOpen: false }),
      toggleShortcutsModal: () =>
        set((s) => ({ shortcutsModalOpen: !s.shortcutsModalOpen })),
    }),
    {
      name: "soc-ui",
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    }
  )
);
