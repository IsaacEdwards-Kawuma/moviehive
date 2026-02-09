/**
 * Minimal declarations for Google Cast Web Sender SDK (loaded via script).
 * @see https://developers.google.com/cast/docs/web_sender
 */
declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    chrome?: {
      cast: {
        AutoJoinPolicy: { ORIGIN_SCOPED: string; PAGE_SCOPED: string; TAB_AND_ORIGIN_SCOPED: string };
        media: {
          DEFAULT_MEDIA_RECEIVER_APP_ID: string;
          MediaInfo: new (contentId: string, contentType: string) => {
            contentId: string;
            contentType: string;
            metadata?: { metadataType: number; title?: string; images?: Array<{ url: string }> };
          };
          LoadRequest: new () => {
            media: InstanceType<typeof chrome.cast.media.MediaInfo>;
            autoplay?: boolean;
            currentTime?: number;
          };
        };
      };
    };
    cast?: {
      framework: {
        CastContext: {
          getInstance: () => {
            setOptions: (opts: { receiverApplicationId: string; autoJoinPolicy: string }) => void;
            getCurrentSession: () => CastSession | null;
            requestSession: () => Promise<CastSession>;
            addEventListener: (type: string, fn: (e: { sessionState: string }) => void) => void;
          };
        };
        SessionState: { SESSION_STARTED: string; SESSION_RESUMED: string; SESSION_ENDED: string };
        CastContextEventType: { SESSION_STATE_CHANGED: string };
      };
    };
  }
}

export interface CastSession {
  loadMedia: (request: unknown) => Promise<unknown>;
  endSession: (stopReceiver?: boolean) => void;
}

export {};
