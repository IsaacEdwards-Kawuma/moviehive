'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { HomePage } from './HomePage';
import { LoginPage } from '@/components/auth/LoginPage';

export function HomeOrLogin() {
  const router = useRouter();
  const { user, setAuth, logout } = useAuthStore();
  const { currentProfile, setCurrentProfile } = useProfileStore();
  const [loading, setLoading] = useState(true);
  const hasSetProfile = useRef(false);

  // Use refs to prevent infinite loops from store function references
  const logoutRef = useRef(logout);
  const setAuthRef = useRef(setAuth);
  const setCurrentProfileRef = useRef(setCurrentProfile);
  
  logoutRef.current = logout;
  setAuthRef.current = setAuth;
  setCurrentProfileRef.current = setCurrentProfile;

  const { data: me, isSuccess: meSuccess, isError: meError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.auth.me(),
    retry: false,
    enabled: !!user?.id,
  });

  const { data: profiles = [], isSuccess: profilesSuccess } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => api.profiles.list(),
    enabled: meSuccess && !!me?.id,
  });

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (meError) {
      logoutRef.current();
      setLoading(false);
      return;
    }
    if (meSuccess && me) {
      setAuthRef.current(me, null);
      if (profilesSuccess) {
        if (profiles.length === 0) {
          router.replace('/profiles');
          return;
        }
        // Only set profile once using ref to prevent loop
        if (!currentProfile && profiles.length > 0 && !hasSetProfile.current) {
          hasSetProfile.current = true;
          setCurrentProfileRef.current(profiles[0]);
        }
        setLoading(false);
      }
    }
  }, [user?.id, me, meSuccess, meError, profiles.length, profilesSuccess, router]); // Removed currentProfile!

  if (loading && user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stream-bg">
        <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.id && profiles.length > 0 && (currentProfile || profiles[0])) {
    return <HomePage />;
  }

  if (user?.id && profiles.length === 0) {
    return null;
  }

  return <LoginPage />;
}