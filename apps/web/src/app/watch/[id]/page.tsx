'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useProfileStore } from '@/store/useProfileStore';
import { VideoPlayer } from '@/components/player/VideoPlayer';

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contentId = params?.id as string;
  const episodeId = searchParams?.get('episode') ?? undefined;
  const { currentProfile } = useProfileStore();
  const progressRef = useRef<number>(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [showUI, setShowUI] = useState(true);
  const uiTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: streamData, isLoading } = useQuery({
    queryKey: ['stream', contentId, episodeId],
    queryFn: () => api.stream.getUrl(contentId, episodeId),
    enabled: !!contentId,
  });

  const saveProgress = useCallback(
    (progress: number, completed: boolean) => {
      if (!currentProfile?.id) return;
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        api.watchHistory
          .update({
            profileId: currentProfile.id,
            contentId,
            episodeId: episodeId ?? null,
            progress,
            completed,
          })
          .catch(() => {});
      }, 1000);
    },
    [currentProfile?.id, contentId, episodeId]
  );

  useEffect(() => {
    return () => {
      clearTimeout(saveTimeoutRef.current);
      if (progressRef.current > 0 && currentProfile?.id) {
        api.watchHistory
          .update({
            profileId: currentProfile.id,
            contentId,
            episodeId: episodeId ?? null,
            progress: progressRef.current,
            completed: false,
          })
          .catch(() => {});
      }
    };
  }, [currentProfile?.id, contentId, episodeId]);

  // Auto-hide UI
  const resetUITimeout = useCallback(() => {
    setShowUI(true);
    clearTimeout(uiTimeoutRef.current);
    uiTimeoutRef.current = setTimeout(() => setShowUI(false), 3000);
  }, []);

  useEffect(() => {
    resetUITimeout();
    return () => clearTimeout(uiTimeoutRef.current);
  }, [resetUITimeout]);

  if (isLoading || !streamData?.url) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-stream-text-secondary animate-pulse">Loading stream...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-black relative"
      onMouseMove={resetUITimeout}
      onClick={resetUITimeout}
    >
      <AnimatePresence>
        {showUI && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Link
              href={`/title/${contentId}`}
              className="absolute top-4 left-4 z-20 flex items-center gap-2 text-white/80 hover:text-white transition-colors glass px-4 py-2 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <VideoPlayer
        src={streamData.url}
        onTimeUpdate={(t) => {
          progressRef.current = Math.round(t);
          saveProgress(progressRef.current, false);
        }}
        onEnded={() => saveProgress(progressRef.current, true)}
      />
    </div>
  );
}
