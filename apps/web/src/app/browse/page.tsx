'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api, { type Content } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { ContentRow } from '@/components/home/ContentRow';

export default function BrowsePage() {
  const { data: genres = [] } = useQuery({
    queryKey: ['search', 'genres'],
    queryFn: () => api.search.genres(),
  });

  const { data: trending = [] } = useQuery({
    queryKey: ['content', 'trending'],
    queryFn: () => api.content.trending(),
  });

  const { data: newReleases = [] } = useQuery({
    queryKey: ['content', 'new-releases'],
    queryFn: () => api.content.newReleases(),
  });

  return (
    <div className="min-h-screen bg-stream-bg">
      <Header />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="pt-24 px-6 md:px-12 pb-12"
      >
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold mb-2 text-glow-white"
        >
          Browse
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-stream-text-secondary mb-8"
        >
          Discover movies and shows
        </motion.p>

        <ContentRow title="Trending" items={trending as Content[]} />
        <ContentRow title="New Releases" items={newReleases as Content[]} />
        {genres.slice(0, 6).map((genre) => (
          <GenreRow key={genre.id} genre={genre} />
        ))}
      </motion.main>
    </div>
  );
}

function GenreRow({ genre }: { genre: { id: string; name: string; slug: string } }) {
  const { data } = useQuery({
    queryKey: ['content', 'genre', genre.slug],
    queryFn: () => api.content.list({ genre: genre.slug, limit: 20 }),
  });
  const items = data?.data ?? [];
  if (items.length === 0) return null;
  return <ContentRow title={genre.name} items={items as Content[]} />;
}
