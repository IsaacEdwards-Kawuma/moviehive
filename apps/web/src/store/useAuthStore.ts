'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type User = { id: string; email: string; subscriptionTier: string; role?: string } | null;

interface AuthState {
  user: User;
  accessToken: string | null;
  isHydrated: boolean;
  setAuth: (user: User, accessToken: string | null) => void;
  setToken: (accessToken: string | null) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isHydrated: false,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      setToken: (accessToken) => set((s) => ({ ...s, accessToken })),
      logout: () => set({ user: null, accessToken: null }),
      setHydrated: () => set({ isHydrated: true }),
    }),
    { 
      name: 'stream-auth', 
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);