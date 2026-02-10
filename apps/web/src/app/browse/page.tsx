'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api, { type Content } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { ContentRow } from '@/components/home/ContentRow';
import { useProfileStore } from '@/store/useProfileStore';

const RATING_OPTIONS = [
  { value: '', label: 'All ratings' },
  { value: 'G', label: 'G' },
  { value: 'PG', label: 'PG' },
  { value: 'PG-13', label: 'PG-13' },
  { value: 'R', label: 'R' },
];

export default function BrowsePage() {
  const { currentProfile } = useProfileStore();
  const kidsOnly = currentProfile?.isKids ?? false;
  const [rating, setRating] = useState('');

  const { data: genres = [] } = useQuery({
    queryKey: ['search', 'genres'],
    queryFn: () => api.search.genres(),
  });

  const { data: trending = [] } = useQuery({
    queryKey: ['content', 'trending', kidsOnly],
    queryFn: () => api.content.trending({ kidsOnly }),
  });

  const { data: newReleases = [] } = useQuery({
    queryKey: ['content', 'new-releases', kidsOnly],
    queryFn: () => api.content.newReleases({ kidsOnly }),
  });

  const { data: ratingList } = useQuery({
    queryKey: ['content', 'list', 'rating', rating, kidsOnly],
    queryFn: () => api.content.list({ rating: rating || undefined, kidsOnly: kidsOnly || undefined, limit: 20 }),
    enabled: !!rating || kidsOnly,
  });

  return (
    <div className="min-h-screen bg-stream-bg">
      <Header />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="pt-20 sm:pt-24 px-4 sm:px-6 md:px-12 pb-8 sm:pb-12"
      >
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold mb-2 text-glow-white"
        >
          Browse
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-stream-text-secondary mb-4 text-sm sm:text-base"
        >
          Discover movies and shows
          {kidsOnly && <span className="block mt-1 text-stream-accent">Showing kid-friendly titles only</span>}
        </motion.p>

        <div className="mb-6 sm:mb-8">
          <label htmlFor="browse-rating" className="sr-only">Filter by rating</label>
          <select
            id="browse-rating"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="bg-stream-dark-gray border border-stream-gray rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-stream-accent"
          >
            {RATING_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <ContentRow title="Trending" items={trending as Content[]} />
        <ContentRow title="New Releases" items={newReleases as Content[]} />
        {rating && ratingList?.data && ratingList.data.length > 0 && (
          <ContentRow
            title={`Rated ${RATING_OPTIONS.find((o) => o.value === rating)?.label ?? rating}`}
            items={ratingList.data as Content[]}
          />
        )}
        {genres.slice(0, 6).map((genre) => (
          <GenreRow key={genre.id} genre={genre} rating={rating} kidsOnly={kidsOnly} />
        ))}
      </motion.main>
    </div>
  );
}

function GenreRow({
  genre,
  rating,
  kidsOnly,
}: {
  genre: { id: string; name: string; slug: string };
  rating: string;
  kidsOnly: boolean;
}) {
  const { data } = useQuery({
    queryKey: ['content', 'genre', genre.slug, rating, kidsOnly],
    queryFn: () =>
      api.content.list({
        genre: genre.slug,
        limit: 20,
        rating: rating || undefined,
        kidsOnly: kidsOnly || undefined,
      }),
  });
  const items = data?.data ?? [];
  if (items.length === 0) return null;
  return <ContentRow title={genre.name} items={items as Content[]} />;
}
