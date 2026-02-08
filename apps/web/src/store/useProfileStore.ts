'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Profile = { id: string; name: string; avatar: string | null; isKids: boolean } | null;

interface ProfileState {
  currentProfile: Profile;
  setCurrentProfile: (profile: Profile) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      currentProfile: null,
      setCurrentProfile: (currentProfile) => set({ currentProfile }),
    }),
    { name: 'stream-profile' }
  )
);
