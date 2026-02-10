'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api, { type Content } from '@/lib/api';
import { useProfileStore } from '@/store/useProfileStore';
import { Header } from '@/components/layout/Header';
import { Hero } from '@/components/home/Hero';
import { ContentRow } from '@/components/home/ContentRow';

export function HomePage() {
  const { currentProfile } = useProfileStore();
  const profileId = currentProfile?.id ?? '';
  const kidsOnly = currentProfile?.isKids ?? false;

  const { data: featured } = useQuery({
    queryKey: ['content', 'featured'],
    queryFn: () => api.content.featured(),
  });

  const { data: continueWatching = [] } = useQuery({
    queryKey: ['watch-history', 'continue', profileId],
    queryFn: () => api.watchHistory.continueWatching(profileId),
    enabled: !!profileId,
  });

  const { data: trending = [] } = useQuery({
    queryKey: ['content', 'trending', kidsOnly],
    queryFn: () => api.content.trending({ kidsOnly }),
  });

  const { data: forYou = [] } = useQuery({
    queryKey: ['recommendations', 'for-you', profileId],
    queryFn: () => api.recommendations.forYou(profileId),
    enabled: !!profileId,
  });

  const { data: newReleases = [] } = useQuery({
    queryKey: ['content', 'new-releases', kidsOnly],
    queryFn: () => api.content.newReleases({ kidsOnly }),
  });

  const { data: homeGenres = [] } = useQuery({
    queryKey: ['content', 'home-genres', kidsOnly],
    queryFn: () => api.content.homeGenres({ kidsOnly }),
  });

  return (
    <div className="min-h-screen bg-stream-bg">
      <Header />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Hero featured={featured} />
        <div className="relative z-10 -mt-16 sm:-mt-20">
          {continueWatching.length > 0 && (
            <ContentRow
              title="Continue Watching"
              items={continueWatching.map((h) => ({ ...h.content, progress: h.progress, episode: h.episode }))}
              progress
            />
          )}
          <ContentRow title="Trending Now" items={trending as Content[]} />
          {forYou.length > 0 && (
            <ContentRow title="Because you watched" items={forYou as Content[]} />
          )}
          <ContentRow title="New Releases" items={newReleases as Content[]} />
          {homeGenres.map((row) => (
            <ContentRow key={row.slug} title={row.name} items={row.items as Content[]} />
          ))}
        </div>
      </motion.main>
    </div>
  );
}
