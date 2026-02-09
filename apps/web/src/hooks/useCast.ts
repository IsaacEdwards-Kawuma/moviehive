'use client';

import { useEffect, useState, useCallback } from 'react';

const CAST_SCRIPT_ID = 'cast-sender-sdk';
const CAST_SCRIPT_URL = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

export interface CastMediaOptions {
  url: string;
  contentType?: string;
  title?: string;
  posterUrl?: string;
  currentTime?: number;
}

export function useCast() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initCast = () => {
      try {
        const cast = window.cast;
        const chromeCast = window.chrome?.cast;
        if (!cast?.framework?.CastContext || !chromeCast?.media) return;

        const context = cast.framework.CastContext.getInstance();
        context.setOptions({
          receiverApplicationId: chromeCast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: chromeCast.AutoJoinPolicy.ORIGIN_SCOPED,
        });
        setIsInitialized(true);
        setIsAvailable(true);

        context.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, (e: { sessionState: string }) => {
          const started = e.sessionState === cast.framework.SessionState.SESSION_STARTED;
          const resumed = e.sessionState === cast.framework.SessionState.SESSION_RESUMED;
          setIsCasting(started || resumed);
        });
      } catch {
        setIsAvailable(false);
      }
    };

    window.__onGCastApiAvailable = (available: boolean) => {
      if (available) initCast();
      else setIsAvailable(false);
    };

    if (document.getElementById(CAST_SCRIPT_ID)) {
      if (window.cast) initCast();
      return;
    }

    const script = document.createElement('script');
    script.id = CAST_SCRIPT_ID;
    script.src = CAST_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.cast) initCast();
    };
    document.head.appendChild(script);

    return () => {
      window.__onGCastApiAvailable = undefined;
    };
  }, []);

  const castVideo = useCallback(
    async (options: CastMediaOptions): Promise<boolean> => {
      const { url, contentType = 'video/mp4', title, posterUrl, currentTime = 0 } = options;
      const cast = window.cast;
      const chromeCast = window.chrome?.cast;
      if (!cast?.framework?.CastContext || !chromeCast?.media) return false;

      const context = cast.framework.CastContext.getInstance();
      let session = context.getCurrentSession();

      if (!session) {
        try {
          session = await context.requestSession();
        } catch {
          return false;
        }
      }

      const mediaInfo = new chromeCast.media.MediaInfo(url, contentType);
      if (title) {
        (mediaInfo as { metadata?: { metadataType: number; title?: string; images?: Array<{ url: string }> } }).metadata = {
          metadataType: 0,
          title,
          images: posterUrl ? [{ url: posterUrl }] : undefined,
        };
      }

      const request = new chromeCast.media.LoadRequest();
      request.media = mediaInfo;
      request.autoplay = true;
      request.currentTime = currentTime;

      try {
        await session.loadMedia(request);
        setIsCasting(true);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const stopCasting = useCallback(() => {
    const cast = window.cast;
    if (!cast?.framework?.CastContext) return;
    const session = cast.framework.CastContext.getInstance().getCurrentSession();
    if (session && typeof session.endSession === 'function') {
      session.endSession(true);
      setIsCasting(false);
    }
  }, []);

  return { isAvailable, isInitialized, isCasting, castVideo, stopCasting };
}
