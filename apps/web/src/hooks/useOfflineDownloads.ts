'use client';

import { useState, useCallback, useEffect } from 'react';
import api, { getApiBase } from '@/lib/api';
import {
  listDownloads,
  getDownloadMeta,
  saveDownload,
  removeDownload,
  getDownloadBlob,
  getStorageEstimate,
  type OfflineDownloadMeta,
} from '@/lib/offlineStorage';
import { useAuthStore } from '@/store/useAuthStore';

export type { OfflineDownloadMeta };

export interface DownloadProgress {
  contentId: string;
  episodeId: string | null;
  percent: number;
  status: 'downloading' | 'saving' | 'done' | 'error';
  error?: string;
}

export function useOfflineDownloads() {
  const [downloads, setDownloads] = useState<OfflineDownloadMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number }>({ usage: 0, quota: 0 });
  const token = useAuthStore((s) => s.accessToken);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listDownloads();
      setDownloads(list);
      const est = await getStorageEstimate();
      setStorageEstimate(est);
    } catch {
      setDownloads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isDownloaded = useCallback(async (contentId: string, episodeId?: string | null): Promise<boolean> => {
    const meta = await getDownloadMeta(contentId, episodeId ?? null);
    return !!meta;
  }, []);

  /** Sync check from current downloads list (no async). */
  const isInDownloads = useCallback(
    (contentId: string, episodeId?: string | null): boolean => {
      return downloads.some(
        (d) => d.contentId === contentId && (episodeId == null ? d.episodeId == null : d.episodeId === episodeId)
      );
    },
    [downloads]
  );

  const getOfflineBlob = useCallback(async (contentId: string, episodeId: string | null): Promise<Blob | null> => {
    return getDownloadBlob(contentId, episodeId);
  }, []);

  const download = useCallback(
    async (params: {
      contentId: string;
      episodeId?: string | null;
      title: string;
      posterUrl?: string | null;
      type: string;
      duration?: number | null;
      season?: number;
      episode?: number;
      episodeTitle?: string | null;
    }) => {
      const { contentId, episodeId = null, title, posterUrl, type, duration, season, episode, episodeTitle } = params;
      setProgress({ contentId, episodeId, percent: 0, status: 'downloading' });

      try {
        const streamRes = await api.stream.getUrl(contentId, episodeId ?? undefined);
        const streamUrl = streamRes.url;
        if (!streamUrl) {
          setProgress((p) => (p ? { ...p, status: 'error', error: 'No stream URL' } : null));
          return;
        }

        const fullUrl = streamUrl.startsWith('http') ? streamUrl : `${getApiBase()}${streamUrl}`;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(fullUrl, { method: 'GET', headers, credentials: 'include' });
        if (!res.ok) {
          setProgress((p) => (p ? { ...p, status: 'error', error: `Download failed (${res.status})` } : null));
          return;
        }

        const contentLength = res.headers.get('Content-Length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        const reader = res.body?.getReader();
        if (!reader) {
          setProgress((p) => (p ? { ...p, status: 'error', error: 'Stream not supported' } : null));
          return;
        }

        const chunks: Uint8Array[] = [];
        let received = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (total > 0) {
            setProgress((p) => (p ? { ...p, percent: Math.min(99, Math.round((received / total) * 100)) } : null));
          }
        }

        setProgress((p) => (p ? { ...p, status: 'saving', percent: 99 } : null));
        const blob = new Blob(chunks, { type: res.headers.get('Content-Type') || 'video/mp4' });
        await saveDownload(contentId, episodeId, {
          title,
          posterUrl: posterUrl ?? null,
          type,
          duration: duration ?? null,
          season,
          episode,
          episodeTitle,
        }, blob);

        setProgress((p) => (p ? { ...p, status: 'done', percent: 100 } : null));
        await refresh();
        setTimeout(() => setProgress(null), 1500);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Download failed';
        setProgress((p) => (p ? { ...p, status: 'error', error: message } : null));
        setTimeout(() => setProgress(null), 3000);
      }
    },
    [token, refresh]
  );

  const remove = useCallback(
    async (contentId: string, episodeId: string | null) => {
      await removeDownload(contentId, episodeId);
      await refresh();
    },
    [refresh]
  );

  return {
    downloads,
    loading,
    progress,
    storageEstimate,
    refresh,
    download,
    remove,
    isDownloaded,
    isInDownloads,
    getOfflineBlob,
  };
}
