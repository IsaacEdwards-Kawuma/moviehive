'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useProfileStore } from '@/store/useProfileStore';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { CastButton } from '@/components/player/CastButton';
import { useOfflineDownloads } from '@/hooks/useOfflineDownloads';

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contentId = params?.id as string;
  const episodeId = searchParams?.get('episode') ?? undefined;
  const offlineOnly = searchParams?.get('offline') === '1';
  const { currentProfile } = useProfileStore();
  const { getOfflineBlob } = useOfflineDownloads();
  const progressRef = useRef<number>(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [showUI, setShowUI] = useState(true);
  const uiTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [offlineUrl, setOfflineUrl] = useState<string | null>(null);
  const [offlineChecked, setOfflineChecked] = useState(false);

  const { data: streamData, isLoading, isError: isStreamError, error: streamError } = useQuery({
    queryKey: ['stream', contentId, episodeId],
    queryFn: () => api.stream.getUrl(contentId, episodeId),
    enabled: !!contentId && !offlineOnly,
    retry: 1,
  });

  const { data: contentDetail } = useQuery({
    queryKey: ['content', contentId],
    queryFn: () => api.content.get(contentId),
    enabled: !!contentId && !!streamData?.url,
  });

  const { data: watchHistory } = useQuery({
    queryKey: ['watch-history', 'resume', currentProfile?.id, contentId],
    queryFn: () => {
      if (!currentProfile?.id) return Promise.resolve([]);
      return api.watchHistory.list(currentProfile.id);
    },
    enabled: !!currentProfile?.id && !!contentId,
    staleTime: 60_000,
  });

  const offlineUrlRef = useRef<string | null>(null);
  // Check offline storage and create object URL if we have a downloaded copy
  useEffect(() => {
    if (!contentId) return;
    setOfflineUrl(null);
    setOfflineChecked(false);
    if (offlineUrlRef.current) {
      URL.revokeObjectURL(offlineUrlRef.current);
      offlineUrlRef.current = null;
    }
    getOfflineBlob(contentId, episodeId ?? null).then((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        offlineUrlRef.current = url;
        setOfflineUrl(url);
      }
      setOfflineChecked(true);
    });
    return () => {
      if (offlineUrlRef.current) {
        URL.revokeObjectURL(offlineUrlRef.current);
        offlineUrlRef.current = null;
      }
    };
  }, [contentId, episodeId, getOfflineBlob]);

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

  const streamUrl = streamData?.proxyUrl ?? streamData?.url;
  const isImageUrl =
    typeof streamData?.url === 'string' && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(streamData.url);
  const videoSrc = offlineUrl ?? (!offlineOnly && streamUrl && !isImageUrl ? streamUrl : null);
  const resumeItem = useMemo(
    () =>
      (watchHistory ?? []).find(
        (h) =>
          h.contentId === contentId &&
          ((episodeId && h.episodeId === episodeId) || (!episodeId && h.episodeId === null))
      ),
    [watchHistory, contentId, episodeId]
  );
  const initialTime =
    !offlineOnly && resumeItem && !resumeItem.completed && resumeItem.progress > 10
      ? resumeItem.progress
      : 0;
  const waitingForOffline = offlineOnly && !offlineChecked;
  const offlineNotFound = offlineOnly && offlineChecked && !offlineUrl;
  const waitingForStream =
    !offlineOnly && !offlineUrl && !isStreamError && (isLoading || !streamData?.url);

  if (waitingForOffline || waitingForStream) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-stream-text-secondary animate-pulse">
            {offlineOnly ? 'Loading offline...' : 'Loading stream...'}
          </p>
        </motion.div>
      </div>
    );
  }

  if (offlineNotFound) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full glass flex items-center justify-center">
            <svg className="w-8 h-8 text-stream-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Not available offline</h1>
          <p className="text-stream-text-secondary mb-6">
            This title isn’t in your downloads. Download it from the title page to watch offline.
          </p>
          <Link
            href={`/title/${contentId}`}
            className="inline-flex items-center gap-2 bg-stream-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
          >
            Go to title
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (isStreamError) {
    const msg = streamError instanceof Error ? streamError.message : '';
    const isUnauthorized =
      msg.toLowerCase().includes('unauthorized') || msg.includes('401') || msg.toLowerCase().includes('sign in');
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full glass flex items-center justify-center">
            <svg className="w-8 h-8 text-stream-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isUnauthorized ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              )}
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">
            {isUnauthorized ? 'Sign in to watch' : "Couldn't load video"}
          </h1>
          <p className="text-stream-text-secondary mb-6">
            {isUnauthorized
              ? 'You need to be signed in on this device to play this video. Sign in below or use the same account on each device.'
              : msg || 'Check your connection and try again.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {isUnauthorized && (
              <Link
                href={`/login?redirect=${encodeURIComponent(`/watch/${contentId}${episodeId ? `?episode=${episodeId}` : ''}`)}`}
                className="inline-flex items-center gap-2 bg-stream-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                Sign in
              </Link>
            )}
            <Link
              href={`/title/${contentId}`}
              className="inline-flex items-center gap-2 glass text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Back to title
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isImageUrl) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full glass flex items-center justify-center">
            <svg className="w-8 h-8 text-stream-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Video URL is an image</h1>
          <p className="text-stream-text-secondary mb-6">
            This title’s Video URL points to an image (e.g. .jpg). That causes loading issues. In Admin, set the
            <strong> Video URL</strong> to a direct video link (MP4 or WebM), not a poster or thumbnail.
          </p>
          <Link
            href={`/title/${contentId}`}
            className="inline-flex items-center gap-2 bg-stream-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
          >
            Back to title
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!videoSrc) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <h1 className="text-xl font-bold mb-2">Video not available</h1>
          <p className="text-stream-text-secondary mb-6">
            This title may not have a playable video yet, or you may need to sign in. Try going back and signing in if you haven’t.
          </p>
          <Link
            href={`/title/${contentId}`}
            className="inline-flex items-center gap-2 bg-stream-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
          >
            Back to title
          </Link>
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
            className="absolute top-3 sm:top-4 left-0 right-0 z-20 flex items-center justify-between px-3 sm:px-4 gap-2"
          >
            <Link
              href={offlineOnly ? `/downloads` : `/title/${contentId}`}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors glass px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base min-w-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
            {!offlineOnly && streamData?.url && (
              <CastButton
                media={{
                  url: streamData.url,
                  title: contentDetail?.title ?? undefined,
                  posterUrl: contentDetail?.posterUrl ?? contentDetail?.thumbnailUrl ?? undefined,
                  currentTime: progressRef.current,
                }}
                className="glass px-3 py-2"
                title="Cast to TV or device"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <VideoPlayer
        src={videoSrc}
        initialTime={initialTime}
        onTimeUpdate={(t) => {
          progressRef.current = Math.round(t);
          saveProgress(progressRef.current, false);
        }}
        onEnded={() => saveProgress(progressRef.current, true)}
      />
    </div>
  );
}
