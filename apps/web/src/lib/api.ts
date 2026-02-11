const RENDER_API_BASE = 'https://moviehive-api.onrender.com/api';

/** API base URL: use env on Vercel/production, fallback to Render URL when on *.vercel.app, else /api/server for local dev. */
export function getApiBase(): string {
  const env = process.env.NEXT_PUBLIC_API_URL;
  if (env && env.startsWith('http')) return env;
  if (typeof window !== 'undefined' && window.location.origin.includes('vercel.app')) return RENDER_API_BASE;
  return '/api/server';
}

let getAccessToken: (() => string | null) | null = null;
let onTokenRefreshed: ((token: string) => void) | null = null;

export function setApiAccessTokenGetter(fn: () => string | null) {
  getAccessToken = fn;
}

/** Called when a new access token is obtained via refresh; used to keep store in sync so multiple tabs/devices can stay logged in. */
export function setApiTokenUpdater(fn: (token: string) => void) {
  onTokenRefreshed = fn;
}

type RequestOptions = RequestInit & {
  params?: Record<string, string | number | undefined>;
  retryOn5xx?: boolean;
};

async function request<T>(
  path: string,
  options: RequestOptions = {},
  retryAfterRefresh = false
): Promise<T> {
  const { params, retryOn5xx: _retryOn5xx, ...init } = options;
  const pathWithParams = path.startsWith('http')
    ? path
    : `${getApiBase()}${path}`;
  const url = new URL(pathWithParams, path.startsWith('http') ? undefined : 'http://localhost');
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    });
  }
  const urlString = pathWithParams.startsWith('http') ? url.toString() : url.pathname + url.search;
  const token = typeof getAccessToken === 'function' ? getAccessToken() : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(urlString, {
      ...init,
      credentials: 'include',
      headers,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('CORS')) {
      throw new Error(
        "Can't reach the API server. On free hosting the server may be starting (wait 30–60 seconds and try again). Otherwise check your connection."
      );
    }
    throw new Error(msg);
  }

  // On 401, try refresh once so sessions stay alive on each device
  if (res.status === 401 && !retryAfterRefresh && !path.includes('/auth/refresh-token') && !path.includes('/auth/login') && !path.includes('/auth/register')) {
    try {
      const refreshUrl = `${getApiBase()}/auth/refresh-token`;
      const refreshRes = await fetch(refreshUrl, { method: 'POST', credentials: 'include' });
      if (refreshRes.ok) {
        const data = (await refreshRes.json()) as { accessToken?: string };
        if (data.accessToken && onTokenRefreshed) {
          onTokenRefreshed(data.accessToken);
          return request<T>(path, options, true);
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Retry once on 5xx for critical requests (e.g. stream URL)
  if (!res.ok && options.retryOn5xx && res.status >= 500) {
    await new Promise((r) => setTimeout(r, 800));
    return request<T>(path, { ...options, retryOn5xx: false }, retryAfterRefresh);
  }

  if (!res.ok) {
    if (res.status === 502 || res.status === 503) {
      throw new Error(
        "API server isn't responding right now. If you're on free hosting, it may be starting up—wait 30–60 seconds and try again."
      );
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function uploadFile(
  path: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ url: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const urlStr = `${getApiBase()}${path}`;
    xhr.open('POST', urlStr);
    const token = typeof getAccessToken === 'function' ? getAccessToken() : null;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.withCredentials = true;
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error('Invalid response')); }
      } else {
        try { const err = JSON.parse(xhr.responseText); reject(new Error(err.error || 'Upload failed')); }
        catch { reject(new Error('Upload failed')); }
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}

/** Admin: extract content metadata from a poster/screenshot image (requires OPENAI_API_KEY on server). */
export type ExtractFromImageResult = {
  title: string | null;
  description: string | null;
  releaseYear: number | null;
  rating: string | null;
  duration: number | null;
  type: 'movie' | 'series';
};

async function adminUploadFile<T>(path: string, formKey: string, file: File): Promise<T> {
  const urlStr = `${getApiBase()}${path}`;
  const token = typeof getAccessToken === 'function' ? getAccessToken() : null;
  const formData = new FormData();
  formData.append(formKey, file);
  const res = await fetch(urlStr, {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Request failed');
  }
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: { id: string; email: string; subscriptionTier: string; role?: string }; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string) =>
      request<{ user: { id: string; email: string; subscriptionTier: string; role?: string }; accessToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request<{ id: string; email: string; subscriptionTier: string; role?: string; emailVerified?: boolean }>('/auth/me'),
    refresh: () => request<{ accessToken: string }>('/auth/refresh-token', { method: 'POST' }),
    deleteAccount: () => request<void>('/auth/me', { method: 'DELETE' }),
    forgotPassword: (email: string) =>
      request<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, newPassword: string) =>
      request<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      }),
    verifyEmail: (token: string) =>
      request<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`),
    sendVerification: () =>
      request<{ message: string }>('/auth/send-verification', { method: 'POST' }),
  },
  profiles: {
    list: () => request<Array<{ id: string; name: string; avatar: string | null; isKids: boolean }>>('/profiles'),
    create: (data: { name: string; avatar?: string; isKids?: boolean }) =>
      request('/profiles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; avatar: string; language: string }>) =>
      request(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/profiles/${id}`, { method: 'DELETE' }),
  },
  content: {
    list: (params?: { genre?: string; year?: number; type?: string; rating?: string; kidsOnly?: boolean; page?: number; limit?: number }) =>
      request<{ data: Content[]; total: number; page: number; totalPages: number }>('/content', {
        params: { ...params, kidsOnly: params?.kidsOnly ? 'true' : undefined } as Record<string, string | number | undefined>,
      }),
    get: (id: string) => request<ContentDetail>(`/content/${id}`),
    trending: (params?: { kidsOnly?: boolean }) =>
      request<Content[]>(`/content/trending${params?.kidsOnly ? '?kidsOnly=true' : ''}`),
    newReleases: (params?: { kidsOnly?: boolean }) =>
      request<Content[]>(`/content/new-releases${params?.kidsOnly ? '?kidsOnly=true' : ''}`),
    featured: () => request<ContentDetail | null>('/content/featured'),
    homeGenres: (params?: { kidsOnly?: boolean }) =>
      request<Array<{ slug: string; name: string; items: Content[] }>>(
        `/content/home-genres${params?.kidsOnly ? '?kidsOnly=true' : ''}`
      ),
    episodes: (id: string) => request<Episode[]>(`/content/${id}/episodes`),
  },
  watchHistory: {
    list: (profileId: string) =>
      request<WatchHistoryItem[]>(`/watch-history?profileId=${profileId}`),
    continueWatching: (profileId: string) =>
      request<WatchHistoryItem[]>(`/watch-history/continue-watching?profileId=${profileId}`),
    update: (data: { profileId: string; contentId: string; episodeId?: string | null; progress: number; completed?: boolean }) =>
      request('/watch-history', { method: 'POST', body: JSON.stringify(data) }),
  },
  myList: {
    list: (profileId: string) => request<Content[]>(`/my-list?profileId=${profileId}`),
    add: (profileId: string, contentId: string) =>
      request('/my-list', { method: 'POST', body: JSON.stringify({ profileId, contentId }) }),
    remove: (profileId: string, contentId: string) =>
      request(`/my-list/${contentId}?profileId=${profileId}`, { method: 'DELETE' }),
  },
  search: {
    query: (q: string, params?: { genre?: string; year?: number; type?: string; page?: number; limit?: number; profileId?: string }) =>
      request<{ data: Content[]; total: number; page: number; totalPages: number }>('/search', {
        params: { q, ...params } as Record<string, string | number | undefined>,
      }),
    suggest: (q: string) => request<Array<{ id: string; slug: string | null; title: string; type: string; thumbnailUrl: string | null }>>(`/search/suggest?q=${encodeURIComponent(q)}`),
    recent: (profileId: string) =>
      request<string[]>(`/search/recent?profileId=${encodeURIComponent(profileId)}`),
    genres: () => request<Array<{ id: string; name: string; slug: string }>>('/search/genres'),
  },
  recommendations: {
    forYou: (profileId: string) =>
      request<Content[]>(`/recommendations/for-you?profileId=${profileId}`),
    similar: (contentId: string) =>
      request<Content[]>(`/recommendations/similar/${contentId}`),
    trending: () => request<Content[]>('/recommendations/trending'),
    newReleases: () => request<Content[]>('/recommendations/new-releases'),
  },
  stream: {
    getUrl: (contentId: string, episodeId?: string) =>
      request<{ url: string; proxyUrl?: string; type: string }>(
        `/stream/${contentId}/url${episodeId ? `?episodeId=${episodeId}` : ''}`,
        { retryOn5xx: true }
      ),
    getEpisodeUrl: (episodeId: string) =>
      request<{ url: string }>(`/stream/episode/${episodeId}/url`),
  },
  ratings: {
    set: (data: { profileId: string; contentId: string; rating?: number; thumbsUp?: boolean }) =>
      request('/ratings', { method: 'POST', body: JSON.stringify(data) }),
    get: (contentId: string, profileId: string) =>
      request<{ rating: number; thumbsUp: boolean | null } | null>(`/ratings/${contentId}?profileId=${profileId}`),
  },
  payments: {
    subscriptionStatus: () =>
      request<{ tier: string; status: string }>('/payments/subscription/status'),
  },
  notifications: {
    list: (params?: { unreadOnly?: boolean; limit?: number }) =>
      request<Array<{ id: string; type: string; title: string; body: string | null; read: boolean; link: string | null; createdAt: string }>>(
        '/notifications',
        { params: params as Record<string, string | number | undefined> }
      ),
    unreadCount: () => request<{ count: number }>('/notifications/unread-count'),
    markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  },
  upload: {
    video: async (file: File, onProgress?: (pct: number) => void): Promise<{ url: string; filename: string }> => {
      return uploadFile('/upload/video', file, onProgress);
    },
    image: async (file: File, onProgress?: (pct: number) => void): Promise<{ url: string; filename: string }> => {
      return uploadFile('/upload/image', file, onProgress);
    },
  },
  admin: {
    getStats: () => request<{ totalUsers: number; totalContent: number; totalWatchHistory: number; totalProfiles: number }>('/admin/stats'),
    getUsers: () => request<Array<{ id: string; email: string; role: string; subscriptionTier: string; disabled: boolean; createdAt: string; _count: { profiles: number } }>>('/admin/users'),
    updateUserRole: (id: string, role: string) => request<{ id: string; email: string; role: string }>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    getContentList: (params?: { type?: string; page?: number; limit?: number }) =>
      request<{ data: AdminContent[]; total: number; page: number; limit: number; totalPages: number }>('/admin/content', { params: params as Record<string, string | number | undefined> }),
    getContent: (id: string) => request<AdminContentDetail>('/admin/content/' + id),
    createContent: (body: AdminContentCreate) => request<AdminContentDetail>('/admin/content', { method: 'POST', body: JSON.stringify(body) }),
    updateContent: (id: string, body: Partial<AdminContentCreate>) => request<AdminContentDetail>(`/admin/content/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteContent: (id: string) => request(`/admin/content/${id}`, { method: 'DELETE' }),
    bulkDeleteContent: (ids: string[]) =>
      request<{ deleted: number }>('/admin/content/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
    addEpisode: (contentId: string, body: AdminEpisodeCreate) =>
      request<AdminEpisode>(`/admin/content/${contentId}/episodes`, { method: 'POST', body: JSON.stringify(body) }),
    updateEpisode: (id: string, body: Partial<AdminEpisodeCreate>) => request<AdminEpisode>(`/admin/episodes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteEpisode: (id: string) => request(`/admin/episodes/${id}`, { method: 'DELETE' }),
    getGenres: () => request<Array<{ id: string; name: string; slug: string }>>('/admin/genres'),
    ensureDefaultGenres: () =>
      request<Array<{ id: string; name: string; slug: string }>>('/admin/genres/ensure-defaults', { method: 'POST' }),
    getAnalytics: () => request<AdminAnalytics>('/admin/analytics'),
    getHealthSummary: () => request<AdminHealthSummary>('/admin/health-summary'),
    updateUserStatus: (id: string, disabled: boolean, logoutSessions?: boolean) =>
      request<{ id: string; email: string; disabled: boolean; role: string }>(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ disabled, logoutSessions }),
      }),
    extractFromImage: (file: File) =>
      adminUploadFile<ExtractFromImageResult>('/admin/extract-from-image', 'image', file),
  },
};

export type AdminContent = Content & {
  _count?: { episodes: number; watchHistory: number; myListItems: number };
  contentGenres?: Array<{ genre: { id: string; name: string; slug: string } }>;
};

export type AdminContentDetail = AdminContent & {
  episodes?: AdminEpisode[];
  trailerUrl?: string | null;
  videoUrl?: string | null;
  _count?: { watchHistory: number; myListItems: number };
};

export type AdminContentCreate = {
  type: 'movie' | 'series';
  title: string;
  description?: string | null;
  releaseYear?: number | null;
  duration?: number | null;
  rating?: string | null;
  thumbnailUrl?: string | null;
  posterUrl?: string | null;
  trailerUrl?: string | null;
  videoUrl?: string | null;
  featured?: boolean;
  genreIds?: string[];
  languages?: string[];
  regions?: string[];
};

export type AdminEpisode = {
  id: string;
  seriesId: string;
  season: number;
  episode: number;
  title: string | null;
  description: string | null;
  duration: number | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  releaseDate: string | null;
  createdAt: string;
};

export type AdminEpisodeCreate = {
  season: number;
  episode: number;
  title?: string | null;
  description?: string | null;
  duration?: number | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
};

export type AdminAnalytics = {
  overview: { totalUsers: number; totalContent: number; totalWatchHistory: number; totalProfiles: number };
  contentByType: Record<string, number>;
  recentContent: Array<{ id: string; title: string; type: string; createdAt: string; thumbnailUrl: string | null }>;
  recentWatchActivity: Array<{
    id: string;
    watchedAt: string;
    content: { id: string; title: string; type: string };
    profile: { id: string; name: string };
  }>;
  topContentByWatches: Array<{ id: string; title: string; type: string; watchCount: number }>;
  recentSearches: string[];
  watchByDay: Array<{ date: string; count: number }>;
  topContentByWatchTime: Array<{ id: string; title: string; type: string; totalSeconds: number; watchCount: number }>;
  topGenresByWatchCount: Array<{ id: string; name: string; slug: string; watchCount: number }>;
  signupsByDay: Array<{ date: string; count: number }>;
  kidsVsRegularWatchSeconds: { kids: number; regular: number };
};

export type AdminHealthSummary = {
  app: {
    status: string;
    uptimeSeconds: number;
    startedAt: string;
  };
  db: {
    status: 'ok' | 'error';
    error: string | null;
  };
};

export type Content = {
  id: string;
  slug: string | null;
  type: string;
  title: string;
  description: string | null;
  releaseYear: number | null;
  duration: number | null;
  rating: string | null;
  thumbnailUrl: string | null;
  posterUrl: string | null;
  featured: boolean;
  contentGenres?: Array<{ genre: { id: string; name: string; slug: string } }>;
};

export type ContentDetail = Content & {
  trailerUrl: string | null;
  videoUrl: string | null;
  episodes?: Episode[];
};

export type Episode = {
  id: string;
  seriesId: string;
  season: number;
  episode: number;
  title: string | null;
  duration: number | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
};

export type WatchHistoryItem = {
  id: string;
  contentId: string;
  episodeId: string | null;
  progress: number;
  completed: boolean;
  content: Content;
  episode?: Episode | null;
};

export default api;