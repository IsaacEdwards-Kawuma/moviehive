const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/server';

let getAccessToken: (() => string | null) | null = null;
export function setApiAccessTokenGetter(fn: () => string | null) {
  getAccessToken = fn;
}

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { params, ...init } = options;
  const pathWithParams = path.startsWith('http')
    ? path
    : `${API_BASE}${path}`;
  const url = new URL(pathWithParams, path.startsWith('http') ? undefined : 'http://localhost');
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    });
  }
  const urlString = path.startsWith('http') ? url.toString() : url.pathname + url.search;
  const token = typeof getAccessToken === 'function' ? getAccessToken() : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(urlString, {
    ...init,
    credentials: 'include',
    headers,
  });
  if (!res.ok) {
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
    const urlStr = `${API_BASE}${path}`;
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
    me: () => request<{ id: string; email: string; subscriptionTier: string; role?: string }>('/auth/me'),
    refresh: () => request<{ accessToken: string }>('/auth/refresh-token', { method: 'POST' }),
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
    list: (params?: { genre?: string; year?: number; type?: string; page?: number; limit?: number }) =>
      request<{ data: Content[]; total: number; page: number; totalPages: number }>('/content', { params: params as Record<string, string | number | undefined> }),
    get: (id: string) => request<ContentDetail>(`/content/${id}`),
    trending: () => request<Content[]>('/content/trending'),
    newReleases: () => request<Content[]>('/content/new-releases'),
    featured: () => request<ContentDetail | null>('/content/featured'),
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
    query: (q: string, params?: { genre?: string; year?: number; type?: string; page?: number; limit?: number }) =>
      request<{ data: Content[]; total: number; page: number; totalPages: number }>('/search', {
        params: { q, ...params } as Record<string, string | number | undefined>,
      }),
    suggest: (q: string) => request<Array<{ id: string; title: string; type: string; thumbnailUrl: string | null }>>(`/search/suggest?q=${encodeURIComponent(q)}`),
    recent: () => request<string[]>('/search/recent'),
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
      request<{ url: string; type: string }>(
        `/stream/${contentId}/url${episodeId ? `?episodeId=${episodeId}` : ''}`
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
    getUsers: () => request<Array<{ id: string; email: string; role: string; subscriptionTier: string; createdAt: string; _count: { profiles: number } }>>('/admin/users'),
    updateUserRole: (id: string, role: string) => request<{ id: string; email: string; role: string }>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    getContentList: (params?: { type?: string; page?: number; limit?: number }) =>
      request<{ data: AdminContent[]; total: number; page: number; limit: number; totalPages: number }>('/admin/content', { params: params as Record<string, string | number | undefined> }),
    getContent: (id: string) => request<AdminContentDetail>('/admin/content/' + id),
    createContent: (body: AdminContentCreate) => request<AdminContentDetail>('/admin/content', { method: 'POST', body: JSON.stringify(body) }),
    updateContent: (id: string, body: Partial<AdminContentCreate>) => request<AdminContentDetail>(`/admin/content/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteContent: (id: string) => request(`/admin/content/${id}`, { method: 'DELETE' }),
    addEpisode: (contentId: string, body: AdminEpisodeCreate) =>
      request<AdminEpisode>(`/admin/content/${contentId}/episodes`, { method: 'POST', body: JSON.stringify(body) }),
    updateEpisode: (id: string, body: Partial<AdminEpisodeCreate>) => request<AdminEpisode>(`/admin/episodes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteEpisode: (id: string) => request(`/admin/episodes/${id}`, { method: 'DELETE' }),
    getGenres: () => request<Array<{ id: string; name: string; slug: string }>>('/admin/genres'),
    getAnalytics: () => request<AdminAnalytics>('/admin/analytics'),
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
};

export type Content = {
  id: string;
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