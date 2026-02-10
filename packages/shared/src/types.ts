export type ContentType = 'movie' | 'series';

export type AgeRating = 'G' | 'PG' | 'PG-13' | 'R' | 'TV-MA' | 'TV-14' | 'TV-Y' | 'TV-Y7';

export type SubscriptionTier = 'basic' | 'standard' | 'premium' | 'free' | 'avod';

export interface User {
  id: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  createdAt: Date;
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  avatar: string | null;
  isKids: boolean;
  language: string;
  pin: string | null;
  colorTheme: string | null;
  createdAt: Date;
}

export interface Content {
  id: string;
  slug: string | null;
  type: ContentType;
  title: string;
  description: string | null;
  releaseYear: number | null;
  duration: number | null;
  rating: AgeRating | null;
  imdbId: string | null;
  tmdbId: number | null;
  featured: boolean;
  thumbnailUrl: string | null;
  posterUrl: string | null;
  trailerUrl: string | null;
  videoUrl: string | null;
  languages: string[];
  regions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Episode {
  id: string;
  seriesId: string;
  season: number;
  episode: number;
  title: string | null;
  description: string | null;
  duration: number | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  releaseDate: Date | null;
  createdAt: Date;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface WatchHistoryItem {
  id: string;
  profileId: string;
  contentId: string;
  episodeId: string | null;
  progress: number;
  completed: boolean;
  watchedAt: Date;
  content?: Content;
  episode?: Episode | null;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchFilters {
  q?: string;
  genre?: string;
  year?: number;
  rating?: AgeRating;
  language?: string;
  type?: ContentType;
  minDuration?: number;
  maxDuration?: number;
  page?: number;
  limit?: number;
}
