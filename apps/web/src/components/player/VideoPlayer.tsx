'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Hls from 'hls.js';

export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
}

/** Infer MIME type from URL so the browser can choose the right codec. */
function getVideoType(url: string): string | undefined {
  try {
    const path = new URL(url, 'http://dummy').pathname.toLowerCase();
    if (path.includes('.m3u8')) return undefined; // HLS handled separately
    if (path.endsWith('.mp4') || path.endsWith('.m4v')) return 'video/mp4';
    if (path.endsWith('.webm')) return 'video/webm';
    if (path.endsWith('.mov')) return 'video/quicktime';
    if (path.endsWith('.mkv')) return 'video/x-matroska';
    return 'video/mp4'; // default for unknown, often works for direct URLs
  } catch {
    return undefined;
  }
}

/** MediaError codes: 1=aborted, 2=network, 3=decode, 4=src not supported */
function getPlaybackErrorMessage(code: number | undefined, wasPlaying: boolean): string {
  switch (code) {
    case 2: // MEDIA_ERR_NETWORK — 404, CORS, unreachable, or connection dropped (e.g. multi-device limit)
      if (wasPlaying) {
        return 'Playback stopped. If you started watching on another device or tab, your video host may limit simultaneous streams. Tap Retry to try again or watch on one device at a time.';
      }
      return 'Video not found or unreachable. Check the URL and that your CDN allows access. If you use Bunny, ensure the Pull Zone allows multiple concurrent streams so different devices can watch at once.';
    case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
      return 'This format is not supported by your browser. Use MP4 (H.264) or WebM.';
    case 1:
    case 3:
    default:
      return wasPlaying
        ? 'Playback failed. Tap Retry to try again.'
        : 'Playback failed. Try again or use a different video URL.';
  }
}

interface VideoPlayerProps {
  src: string;
  initialTime?: number;
  /** Optional WebVTT or similar subtitle track URL */
  trackUrl?: string;
  onTimeUpdate?: (seconds: number) => void;
  onEnded?: () => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
  { src, initialTime = 0, trackUrl, onTimeUpdate, onEnded },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hadStartedPlayingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useImperativeHandle(ref, () => ({
    seekTo(seconds: number) {
      const video = videoRef.current;
      if (video) {
        const duration = Number.isFinite(video.duration) ? video.duration : 1e6;
        video.currentTime = Math.max(0, Math.min(seconds, duration));
        onTimeUpdate?.(video.currentTime);
      }
    },
    getCurrentTime() {
      return videoRef.current?.currentTime ?? 0;
    },
  }), [onTimeUpdate]);

  // Attach time/end listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => onTimeUpdate?.(video.currentTime);
    const handleEnded = () => onEnded?.();
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onEnded]);

  // Keyboard shortcuts: Space = play/pause, M = mute, F = fullscreen, arrows = seek/volume
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (video.paused) video.play().catch(() => {});
          else video.pause();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          video.muted = !video.muted;
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          else video.requestFullscreen?.() ?? video.parentElement?.requestFullscreen?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load video source — detect HLS vs MP4/WebM
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(null);
    setCheckingUrl(true);

    // Reject YouTube / youtu.be — they can't be played in <video> (CORS, redirects)
    try {
      const u = new URL(src);
      const isYoutube =
        u.hostname === 'youtube.com' ||
        u.hostname === 'www.youtube.com' ||
        u.hostname === 'youtu.be' ||
        u.hostname === 'm.youtube.com';
      if (isYoutube) {
        setCheckingUrl(false);
        setError(
          'This is a YouTube link. Use a direct video URL (MP4) for playback. Put YouTube links only in the Trailer field.'
        );
        return;
      }
    } catch {
      /* ignore */
    }

    // Reject image URLs — they cause OpaqueResponseBlocking and aren't video
    const path = src.toLowerCase();
    if (
      path.includes('.jpg') ||
      path.includes('.jpeg') ||
      path.includes('.png') ||
      path.includes('.webp') ||
      path.includes('.gif')
    ) {
      setCheckingUrl(false);
      setError('This is an image URL. Use a direct video URL (MP4 or WebM) in the Video URL field.');
      return;
    }

    // Destroy previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = src.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      setCheckingUrl(false);
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError('Video playback failed. Please try again.');
              hls.destroy();
              break;
          }
        }
      });
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      setCheckingUrl(false);
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      }, { once: true });
    } else {
      // Plain MP4/WebM: set crossOrigin BEFORE source so CORS is used for the request
      video.crossOrigin = 'anonymous';
      video.removeAttribute('src');
      video.innerHTML = '';
      hadStartedPlayingRef.current = false;

      // Skip HEAD for proxy URLs: our proxy doesn't support HEAD (would do full GET and slow load). Start loading immediately.
      const isProxyUrl = src.includes('/stream/') && src.includes('proxy');
      const videoType = getVideoType(src);
      const runLoad = () => {
        setCheckingUrl(false);
        const source = document.createElement('source');
        source.src = src;
        if (videoType) source.type = videoType;
        video.appendChild(source);
        video.load();
        video.addEventListener('loadeddata', () => {
          if (initialTime && initialTime > 0) {
            try {
              video.currentTime = initialTime;
            } catch {
              // ignore seek errors
            }
          }
          hadStartedPlayingRef.current = true;
          video.play().catch(() => {});
        }, { once: true });
        video.addEventListener('error', () => {
          setError(getPlaybackErrorMessage(video.error?.code, hadStartedPlayingRef.current));
        }, { once: true });
      };

      if (isProxyUrl) {
        runLoad();
      } else {
        fetch(src, { method: 'HEAD', mode: 'cors', credentials: 'omit' })
          .then((res) => {
            if (!res.ok) {
              if (res.status === 404) {
                setCheckingUrl(false);
                setError('Video not found (404). Check that the URL is correct and the file exists on your CDN.');
                return;
              }
              runLoad();
              return;
            }
            runLoad();
          })
          .catch(() => runLoad());
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, initialTime, retryKey]);

  return (
    <div className="relative w-full h-screen bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        autoPlay
        playsInline
        preload="auto"
      >
        {trackUrl && (
          <track kind="subtitles" src={trackUrl} srcLang="en" label="English" default />
        )}
      </video>
      {checkingUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-stream-text-secondary text-sm">Checking video...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center max-w-md px-6">
            <svg className="w-16 h-16 text-stream-accent mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-white text-lg mb-2">Playback Error</p>
            <p className="text-stream-text-secondary text-sm whitespace-pre-line mb-4">{error}</p>
            <button
              type="button"
              onClick={() => { setError(null); setRetryKey((k) => k + 1); }}
              className="px-5 py-2.5 rounded-lg bg-stream-accent text-white font-semibold hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
