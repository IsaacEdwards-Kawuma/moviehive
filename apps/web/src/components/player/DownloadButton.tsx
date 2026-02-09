'use client';

import { useOfflineDownloads } from '@/hooks/useOfflineDownloads';

interface DownloadButtonProps {
  contentId: string;
  episodeId?: string | null;
  title: string;
  posterUrl?: string | null;
  type: string;
  duration?: number | null;
  season?: number;
  episode?: number;
  episodeTitle?: string | null;
  className?: string;
  variant?: 'icon' | 'full';
}

export function DownloadButton({
  contentId,
  episodeId = null,
  title,
  posterUrl,
  type,
  duration,
  season,
  episode,
  episodeTitle,
  className = '',
  variant = 'full',
}: DownloadButtonProps) {
  const { download, remove, progress, isInDownloads } = useOfflineDownloads();
  const isThisDownloading =
    progress?.contentId === contentId && progress?.episodeId === episodeId && progress?.status === 'downloading';
  const isThisSaving =
    progress?.contentId === contentId && progress?.episodeId === episodeId && progress?.status === 'saving';
  const isThisError =
    progress?.contentId === contentId && progress?.episodeId === episodeId && progress?.status === 'error';
  const downloaded = isInDownloads(contentId, episodeId);

  const handleClick = () => {
    if (downloaded) {
      remove(contentId, episodeId);
      return;
    }
    if (progress && progress.status === 'downloading') return;
    download({
      contentId,
      episodeId,
      title,
      posterUrl,
      type,
      duration,
      season,
      episode,
      episodeTitle,
    });
  };

  const label = downloaded
    ? 'Downloaded'
    : isThisDownloading || isThisSaving
      ? 'Downloading…'
      : isThisError
        ? 'Retry'
        : 'Download';

  const percent = progress?.contentId === contentId && progress?.episodeId === episodeId ? progress.percent : 0;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isThisDownloading || isThisSaving}
        className={`flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-70 ${
          variant === 'icon'
            ? 'p-2.5 glass hover:bg-white/10 text-white'
            : 'glass px-6 py-3 text-white hover:bg-white/10 disabled:cursor-not-allowed'
        } ${downloaded ? 'text-stream-accent border border-stream-accent/30' : ''}`}
        title={downloaded ? 'Remove from downloads' : 'Download for offline'}
      >
        {(isThisDownloading || isThisSaving) ? (
          <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            {downloaded ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            )}
          </svg>
        )}
        {variant === 'full' && <span>{label}</span>}
      </button>
      {(isThisDownloading || isThisSaving) && percent > 0 && (
        <div className="w-full max-w-[120px] h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-stream-accent transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      {isThisError && variant === 'full' && (
        <p className="text-xs text-red-400">{progress?.error}</p>
      )}
    </div>
  );
}
