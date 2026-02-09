'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type ContentDetail } from '@/lib/api';
import { useProfileStore } from '@/store/useProfileStore';
import { Header } from '@/components/layout/Header';
import { DownloadButton } from '@/components/player/DownloadButton';

export default function TitlePage() {
  const params = useParams();
  const id = params?.id as string;
  const { currentProfile } = useProfileStore();
  const queryClient = useQueryClient();

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
    },
  });

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
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-10">
            <motion.h1
              initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold mb-3 text-glow-white"
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
        <div className="px-6 md:px-12 py-8 flex flex-col md:flex-row gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex-1"
          >
            <p className="text-stream-text-secondary text-base leading-relaxed mb-8">
              {detail.description}
            </p>

            <div className="flex gap-3 flex-wrap">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href={isSeries ? `/watch/${id}?episode=${episodes[0]?.id}` : `/watch/${id}`}
                  className="flex items-center gap-2 bg-white text-stream-bg px-7 py-3 rounded-lg font-semibold shadow-glow-white hover:shadow-lg transition-all duration-300 text-lg"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Play
                </Link>
              </motion.div>

              <motion.button
                type="button"
                onClick={() => addRemoveMu.mutate()}
                disabled={!currentProfile?.id || addRemoveMu.isPending}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 glass px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 ${
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
            </div>
          </motion.div>

          {/* Episodes sidebar */}
          {isSeries && episodes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="w-full md:w-[420px]"
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-stream-accent rounded-full" />
                Episodes
              </h2>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {episodes.map((ep, i) => (
                  <motion.div
                    key={ep.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + i * 0.04 }}
                    className="flex gap-3 p-3 rounded-lg hover:bg-white/5 group transition-all duration-300 card-shine items-center"
                  >
                    <Link href={`/watch/${id}?episode=${ep.id}`} className="flex gap-3 flex-1 min-w-0">
                      <div className="w-36 flex-shrink-0 aspect-video rounded-md overflow-hidden bg-stream-dark-gray relative">
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
                        <p className="font-medium group-hover:text-stream-accent transition-colors">
                          S{ep.season} E{ep.episode} {ep.title ?? `Episode ${ep.episode}`}
                        </p>
                        {ep.duration && (
                          <p className="text-sm text-stream-text-secondary mt-1">{Math.floor(ep.duration / 60)} min</p>
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
    </div>
  );
}
