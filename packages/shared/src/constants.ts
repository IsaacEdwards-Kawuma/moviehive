export const AGE_RATINGS = ['G', 'PG', 'PG-13', 'R', 'TV-MA', 'TV-14', 'TV-Y', 'TV-Y7'] as const;

export const SUBSCRIPTION_TIERS = {
  basic: { screens: 1, quality: 'SD', price: 9.99 },
  standard: { screens: 2, quality: 'HD', price: 15.99 },
  premium: { screens: 4, quality: '4K', price: 19.99 },
  free: { screens: 1, quality: 'SD', price: 0 },
  avod: { screens: 1, quality: 'SD', price: 0 },
} as const;

export const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western',
] as const;

export const VIDEO_QUALITIES = ['360p', '480p', '720p', '1080p', '4K'] as const;

export const NETFLIX_PALETTE = {
  red: '#E50914',
  black: '#141414',
  darkGray: '#2F2F2F',
  gray: '#808080',
  white: '#FFFFFF',
  bgPrimary: '#141414',
  bgSecondary: '#000000',
  textPrimary: '#FFFFFF',
  textSecondary: '#CCCCCC',
  accent: '#E50914',
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
