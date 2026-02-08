'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';

const AVATAR_COLORS = [
  'from-red-500 to-orange-500',
  'from-blue-500 to-purple-500',
  'from-green-500 to-teal-500',
  'from-pink-500 to-rose-500',
  'from-yellow-500 to-amber-500',
];

export default function ProfilesPage() {
  const { user } = useAuthStore();
  const { setCurrentProfile } = useProfileStore();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => api.profiles.list(),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id) {
      window.location.href = '/';
    }
  }, [user?.id]);

  const selectProfile = (profile: { id: string; name: string; avatar: string | null; isKids: boolean }) => {
    setCurrentProfile(profile);
    window.location.href = '/';
  };

  if (!user?.id) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stream-bg">
        <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stream-bg px-6 relative overflow-hidden">
      {/* Background ambient effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-stream-accent/5 rounded-full blur-[150px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-[120px]" />

      <motion.h1
        initial={{ opacity: 0, y: -20, letterSpacing: '0.2em' }}
        animate={{ opacity: 1, y: 0, letterSpacing: 'normal' }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="text-4xl md:text-6xl font-bold mb-16 text-glow-white"
      >
        Who&apos;s watching?
      </motion.h1>

      <div className="flex flex-wrap justify-center gap-8 md:gap-10 mb-16">
        {profiles.map((profile, i) => (
          <motion.button
            key={profile.id}
            type="button"
            onClick={() => selectProfile(profile)}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-4 group"
          >
            <div className={`w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-4xl md:text-5xl font-bold border-4 border-transparent group-hover:border-white group-hover:shadow-glow-white transition-all duration-300 overflow-hidden`}>
              {profile.avatar ? (
                <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white drop-shadow-lg">{profile.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="text-stream-text-secondary text-lg group-hover:text-white transition-colors duration-300 font-medium">
              {profile.name}
            </span>
          </motion.button>
        ))}

        {profiles.length < 5 && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 + profiles.length * 0.1, duration: 0.5 }}
          >
            <Link
              href="/profiles/new"
              className="flex flex-col items-center gap-4 group"
            >
              <motion.div
                whileHover={{ scale: 1.1, borderColor: 'rgba(255,255,255,0.5)' }}
                className="w-28 h-28 md:w-36 md:h-36 rounded-2xl glass flex items-center justify-center border-2 border-dashed border-stream-gray group-hover:border-stream-text-secondary transition-all duration-300"
              >
                <svg className="w-14 h-14 text-stream-gray group-hover:text-white group-hover:rotate-90 transition-all duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </motion.div>
              <span className="text-stream-text-secondary text-lg group-hover:text-white transition-colors duration-300 font-medium">
                Add Profile
              </span>
            </Link>
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Link
          href="/profiles/manage"
          className="text-stream-text-secondary border border-white/20 px-8 py-2.5 rounded-lg hover:border-white hover:text-white hover:bg-white/5 transition-all duration-300 font-medium"
        >
          Manage Profiles
        </Link>
      </motion.div>
    </div>
  );
}
