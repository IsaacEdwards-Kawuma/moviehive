'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineDownloads, type OfflineDownloadMeta } from '@/hooks/useOfflineDownloads';
import { Header } from '@/components/layout/Header';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function DownloadCard({
  item,
  onRemove,
}: {
  item: OfflineDownloadMeta;
  onRemove: (contentId: string, episodeId: string | null) => void;
}) {
  const watchHref = item.episodeId
    ? `/watch/${item.contentId}?episode=${item.episodeId}&offline=1`
    : `/watch/${item.contentId}?offline=1`;
  const label =
    item.type === 'series' && item.episodeId
      ? `S${item.season ?? '?'} E${item.episode ?? '?'} ${item.episodeTitle ?? item.title}`
      : item.title;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 card-shine"
    >
      <Link href={watchHref} className="block">
        <div className="aspect-video relative bg-stream-dark-gray">
          <img
            src={item.posterUrl ?? ''}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
            <span className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center text-stream-bg shadow-lg">
              <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-xs text-white/90">
            Offline
          </div>
        </div>
        <div className="p-3">
          <p className="font-semibold text-white truncate" title={label}>
            {label}
          </p>
          {item.duration != null && (
            <p className="text-sm text-stream-text-secondary mt-0.5">
              {Math.floor(item.duration / 60)} min
            </p>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onRemove(item.contentId, item.episodeId);
        }}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-red-500/80 flex items-center justify-center text-white transition-colors z-10"
        title="Remove download"
        aria-label="Remove download"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}

export default function DownloadsPage() {
  const { downloads, loading, storageEstimate, remove } = useOfflineDownloads();

  return (
    <div className="min-h-screen bg-stream-bg">
      <Header />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="pt-20 sm:pt-24 px-4 sm:px-6 md:px-12 pb-8 sm:pb-12"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-1.5 h-6 sm:h-8 bg-stream-accent rounded-full flex-shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Downloads</h1>
          </div>
          <p className="text-stream-text-secondary text-sm">
            Watch offline · {formatBytes(storageEstimate.usage)} used
            {storageEstimate.quota > 0 && ` of ${formatBytes(storageEstimate.quota)}`}
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-video rounded-lg skeleton" />
                <div className="h-4 w-3/4 rounded skeleton" />
              </div>
            ))}
          </div>
        ) : downloads.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full glass flex items-center justify-center">
              <svg
                className="w-10 h-10 text-stream-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </div>
            <p className="text-stream-text-secondary text-lg mb-2">No downloads yet</p>
            <p className="text-stream-text-secondary/60 text-sm max-w-md mx-auto mb-6">
              Download movies and episodes from a title page to watch them offline. They’ll appear here.
            </p>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 bg-stream-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
            >
              Browse titles
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {downloads.map((item) => (
                <DownloadCard key={`${item.contentId}_${item.episodeId ?? 'm'}`} item={item} onRemove={remove} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </motion.main>
    </div>
  );
}
