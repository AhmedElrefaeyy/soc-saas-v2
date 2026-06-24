import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types/auth";

// Temporary MFA challenge state — holds credentials just long enough for the
// MFA prompt screen.  Never persisted to localStorage.
interface MFAPending {
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  activeTenantId: string | null;
  // mfaPending is in-memory only (NOT in partialize) — cleared on page reload
  mfaPending: MFAPending | null;

  // Actions
  setAuth: (user: User, accessToken: string) => void;
  setTokens: (accessToken: string) => void;
  setActiveTenant: (tenantId: string | null) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setMFAPending: (pending: MFAPending | null) => void;

  // Computed
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      activeTenantId: null,
      mfaPending: null,

      // refreshToken is intentionally absent from state.
      // It lives exclusively in an httpOnly SameSite=strict cookie set by the server.
      // Storing it in JS memory would expose it to XSS; the cookie is inaccessible to JS.

      setAuth: (user, accessToken) =>
        set({ user, accessToken, mfaPending: null }),

      setTokens: (accessToken) =>
        set({ accessToken }),

      setActiveTenant: (tenantId) =>
        set({ activeTenantId: tenantId }),

      setUser: (user) =>
        set({ user }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          activeTenantId: null,
          mfaPending: null,
        }),

      setMFAPending: (pending) =>
        set({ mfaPending: pending }),

      isAuthenticated: () => {
        const { accessToken } = get();
        return accessToken !== null;
      },
    }),
    {
      name: "soc-auth",
      storage: createJSONStorage(() => localStorage),
      // accessToken and user are NOT persisted — they are re-hydrated on page load
      // via /auth/me.  Only the active tenant selection survives a hard reload.
      // mfaPending is intentionally excluded — it must not survive a page reload.
      partialize: (state) => ({
        activeTenantId: state.activeTenantId,
        user: state.user,
      }),
    },
  ),
);
