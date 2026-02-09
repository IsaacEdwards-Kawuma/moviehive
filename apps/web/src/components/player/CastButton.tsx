'use client';

import { useCast, type CastMediaOptions } from '@/hooks/useCast';

interface CastButtonProps {
  /** When provided, clicking will cast this media to the selected device. */
  media?: CastMediaOptions | null;
  className?: string;
  title?: string;
}

function CastIcon({ connected }: { connected: boolean }) {
  return (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      {connected ? (
        <path d="M21 3H3c-1.1 0-2 .9-2 2v2c0 .55.45 1 1 1s1-.45 1-1V5c0-.55.45-1 1-1h16c.55 0 1 .45 1 1v14c0 .55-.45 1-1 1h-4c-.55 0-1 .45-1 1s.45 1 1 1h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 18c-.28 0-.5.22-.5.5s.22.5.5.5.5-.22.5-.5-.22-.5-.5-.5zm3.5 0c-.28 0-.5.22-.5.5s.22.5.5.5.5-.22.5-.5-.22-.5-.5-.5zm-7-3h10c.55 0 1-.45 1-1s-.45-1-1-1h-10c-.55 0-1 .45-1 1s.45 1 1 1z" />
      ) : (
        <path d="M21 3H3c-1.1 0-2 .9-2 2v2c0 .55.45 1 1 1s1-.45 1-1V5c0-.55.45-1 1-1h16c.55 0 1 .45 1 1v14c0 .55-.45 1-1 1h-4c-.55 0-1 .45-1 1s.45 1 1 1h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9.5 18c-.28 0-.5.22-.5.5s.22.5.5.5.5-.22.5-.5-.22-.5-.5-.5zm3.5 0c-.28 0-.5.22-.5.5s.22.5.5.5.5-.22.5-.5-.22-.5-.5-.5zm-7-3h10c.55 0 1-.45 1-1s-.45-1-1-1h-10c-.55 0-1 .45-1 1s.45 1 1 1z" />
      )}
    </svg>
  );
}

export function CastButton({ media, className = '', title = 'Cast to device' }: CastButtonProps) {
  const { isAvailable, isCasting, castVideo, stopCasting } = useCast();

  const handleClick = async () => {
    if (!isAvailable) return;
    if (isCasting) {
      stopCasting();
      return;
    }
    if (media?.url) {
      const contentType = media.url.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
      await castVideo({
        url: media.url,
        contentType,
        title: media.title,
        posterUrl: media.posterUrl,
        currentTime: media.currentTime ?? 0,
      });
    } else {
      // No media: just request session so user can pick a device (receiver will show "no media" until they cast from somewhere that has media)
      const context = typeof window !== 'undefined' && window.cast?.framework?.CastContext.getInstance();
      if (context && !context.getCurrentSession()) context.requestSession().catch(() => {});
    }
  };

  if (!isAvailable) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center justify-center rounded-lg p-2 text-white/90 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 ${className}`}
      title={isCasting ? 'Stop casting' : title}
      aria-label={isCasting ? 'Stop casting' : title}
    >
      <CastIcon connected={isCasting} />
    </button>
  );
}
