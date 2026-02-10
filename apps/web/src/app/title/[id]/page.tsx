'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type ContentDetail } from '@/lib/api';
import { useProfileStore } from '@/store/useProfileStore';
import { Header } from '@/components/layout/Header';
import { DownloadButton } from '@/components/player/DownloadButton';
import { useToast } from '@/context/ToastContext';

/** Returns YouTube embed URL or null if not YouTube. */
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'youtu.be') {
      let vid = u.searchParams.get('v') ?? null;
      if (host === 'youtu.be') vid = u.pathname.slice(1).split('/')[0] || null;
      if (vid) return `https://www.youtube.com/embed/${vid}?autoplay=1`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default function TitlePage() {
  const params = useParams();
  const id = params?.id as string;
  const { currentProfile } = useProfileStore();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [trailerOpen, setTrailerOpen] = useState(false);

  const { data: content, isLoading } = useQuery({
    queryKey: ['content', id],
    queryFn: () => api.content.get(id),
    enabled: !!id,
  });

  const { data: inList } = useQuery({
    queryKey: ['my-list', currentProfile?.id, id],
    queryFn: async () => {
      if (!currentProfile?.id) return false;
      const list = await api.myList.list(currentProfile.id);
      return list.some((c) => c.id === id);
    },
    enabled: !!currentProfile?.id && !!id,
  });

  const addRemoveMu = useMutation({
    mutationFn: async () => {
      if (!currentProfile?.id) return;
      if (inList) await api.myList.remove(currentProfile.id, id);
      else await api.myList.add(currentProfile.id, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-list', currentProfile?.id] });
      showToast(inList ? 'Removed from My List' : 'Added to My List');
    },
  });

  const trailerEmbedUrl = useMemo(() => {
    if (!content) return null;
    const d = content as ContentDetail;
    const url = d.trailerUrl?.trim() || null;
    return url ? getYouTubeEmbedUrl(url) : null;
  }, [content]);

  if (isLoading || !content) {
    return (
      <div className="min-h-screen bg-stream-bg">
        <Header />
        <div className="pt-20">
          {/* Skeleton hero */}
          <div className="relative h-[50vh] min-h-[300px] skeleton" />
          <div className="px-6 md:px-12 py-8 space-y-4">
            <div className="h-6 w-96 rounded skeleton" />
            <div className="h-4 w-full max-w-xl rounded skeleton" />
            <div className="h-4 w-80 rounded skeleton" />
          </div>
        </div>
      </div>
    );
  }

  const detail = content as ContentDetail;
  const isSeries = detail.type === 'series';
  const episodes = detail.episodes ?? [];
  const trailerUrl = detail.trailerUrl?.trim() || null;
  const isTrailerYouTube = !!trailerEmbedUrl;

  return (
    <div className="min-h-screen bg-stream-bg">
      <Header />
      <div className="pt-20">
        {/* Cinematic hero */}
        <div className="relative h-[50vh] min-h-[350px] overflow-hidden cinema-grain">
          <motion.img
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            src={detail.posterUrl ?? detail.thumbnailUrl ?? ''}
            alt=""
            className="absolute inset-0 w-full h-full object-cover animate-cinema-pan"
          />
          {/* Multi-layer overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-stream-bg via-stream-bg/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-stream-bg/80 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-hero-vignette opacity-40" />

          {/* Content info at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-12 z-10">
            <motion.h1
              initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-2xl sm:text-4xl md:text-6xl font-bold mb-2 sm:mb-3 text-glow-white leading-tight"
            >
              {detail.title}
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-3 text-sm"
            >
              {detail.releaseYear && (
                <span className="glass-light px-3 py-1 rounded-full">{detail.releaseYear}</span>
              )}
              {detail.duration && (
                <span className="glass-light px-3 py-1 rounded-full">
                  {Math.floor(detail.duration / 60)}h {detail.duration % 60}m
                </span>
              )}
              {detail.rating && (
                <span className="glass-light px-3 py-1 rounded-full border border-stream-accent/30 text-stream-accent">
                  {detail.rating}
                </span>
              )}
              {detail.contentGenres?.map((g) => (
                <span key={g.genre.slug} className="text-stream-text-secondary">
                  {g.genre.name}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Details section */}
        <div className="px-4 sm:px-6 md:px-12 py-6 sm:py-8 flex flex-col md:flex-row gap-6 md:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex-1 min-w-0"
          >
            <p className="text-stream-text-secondary text-sm sm:text-base leading-relaxed mb-6 sm:mb-8">
              {detail.description}
            </p>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                <Link
                  href={isSeries ? `/watch/${id}?episode=${episodes[0]?.id}` : `/watch/${id}`}
                  onMouseEnter={() => {
                    const episodeId = isSeries ? episodes[0]?.id : undefined;
                    queryClient.prefetchQuery({
                      queryKey: ['stream', id, episodeId],
                      queryFn: () => api.stream.getUrl(id, episodeId),
                      staleTime: 60_000,
                    });
                  }}
                  className="flex items-center justify-center gap-2 bg-white text-stream-bg px-5 sm:px-7 py-2.5 sm:py-3 rounded-lg font-semibold shadow-glow-white hover:shadow-lg transition-all duration-300 text-base sm:text-lg"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Play
                </Link>
              </motion.div>

              {trailerUrl && (
                <motion.button
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 glass px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all duration-300 hover:bg-white/10"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Play trailer
                </motion.button>
              )}
              <motion.button
                type="button"
                onClick={() => addRemoveMu.mutate()}
                disabled={!currentProfile?.id || addRemoveMu.isPending}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center justify-center gap-2 glass px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 flex-1 sm:flex-initial min-w-0 ${
                  inList ? 'text-stream-accent border border-stream-accent/30' : 'text-white hover:bg-white/10'
                }`}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={inList ? 'check' : 'plus'}
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    {inList ? '✓' : '+'}
                  </motion.span>
                </AnimatePresence>
                {inList ? 'In My List' : 'My List'}
              </motion.button>

              <DownloadButton
                contentId={id}
                episodeId={isSeries ? episodes[0]?.id ?? null : null}
                title={detail.title}
                posterUrl={detail.posterUrl ?? detail.thumbnailUrl}
                type={detail.type}
                duration={detail.duration}
                season={isSeries ? episodes[0]?.season : undefined}
                episode={isSeries ? episodes[0]?.episode : undefined}
                episodeTitle={isSeries ? episodes[0]?.title : undefined}
                className="flex-shrink-0"
              />
              <motion.button
                type="button"
                onClick={async () => {
                  const url = typeof window !== 'undefined' ? window.location.href : '';
                  try {
                    if (typeof navigator !== 'undefined' && navigator.share) {
                      await navigator.share({
                        title: detail.title,
                        url,
                        text: `Watch ${detail.title} on MOVI HIVE`,
                      });
                      showToast('Shared');
                    } else {
                      await navigator.clipboard?.writeText(url);
                      showToast('Link copied to clipboard');
                    }
                  } catch {
                    if (navigator.clipboard) {
                      await navigator.clipboard.writeText(url).then(() => showToast('Link copied to clipboard')).catch(() => {});
                    }
                  }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 glass px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-colors hover:bg-white/10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </motion.button>
            </div>
          </motion.div>

          {/* Episodes sidebar */}
          {isSeries && episodes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="w-full md:w-[420px] flex-shrink-0"
            >
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-stream-accent rounded-full flex-shrink-0" />
                Episodes
              </h2>
              <div className="space-y-2 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-2 -mr-2">
                {episodes.map((ep, i) => (
                  <motion.div
                    key={ep.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + i * 0.04 }}
                    className="flex gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-white/5 group transition-all duration-300 card-shine items-center"
                  >
                    <Link
                      href={`/watch/${id}?episode=${ep.id}`}
                      onMouseEnter={() => {
                        queryClient.prefetchQuery({
                          queryKey: ['stream', id, ep.id],
                          queryFn: () => api.stream.getUrl(id, ep.id),
                          staleTime: 60_000,
                        });
                      }}
                      className="flex gap-2 sm:gap-3 flex-1 min-w-0"
                    >
                      <div className="w-24 sm:w-32 md:w-36 flex-shrink-0 aspect-video rounded-md overflow-hidden bg-stream-dark-gray relative">
                        <img
                          src={ep.thumbnailUrl ?? detail.thumbnailUrl ?? ''}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <span className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-stream-bg">
                            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base group-hover:text-stream-accent transition-colors line-clamp-2">
                          S{ep.season} E{ep.episode} {ep.title ?? `Episode ${ep.episode}`}
                        </p>
                        {ep.duration && (
                          <p className="text-xs sm:text-sm text-stream-text-secondary mt-0.5 sm:mt-1">{Math.floor(ep.duration / 60)} min</p>
                        )}
                      </div>
                    </Link>
                    <div onClick={(e) => e.preventDefault()}>
                      <DownloadButton
                        contentId={id}
                        episodeId={ep.id}
                        title={detail.title}
                        posterUrl={ep.thumbnailUrl ?? detail.thumbnailUrl}
                        type="series"
                        duration={ep.duration}
                        season={ep.season}
                        episode={ep.episode}
                        episodeTitle={ep.title}
                        variant="icon"
                        className="flex-shrink-0"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {trailerOpen && trailerUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setTrailerOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setTrailerOpen(false)}
                className="absolute top-2 right-2 z-10 w-10 h-10 rounded-full glass flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                aria-label="Close trailer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {isTrailerYouTube ? (
                <iframe
                  src={trailerEmbedUrl!}
                  title="Trailer"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={trailerUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  onEnded={() => setTrailerOpen(false)}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
