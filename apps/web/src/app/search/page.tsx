'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api, { type Content } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { useDebounce } from '@/hooks/useDebounce';
import { useProfileStore } from '@/store/useProfileStore';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { currentProfile } = useProfileStore();
  const profileId = currentProfile?.id ?? '';

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, profileId],
    queryFn: () => api.search.query(debouncedQuery, { limit: 30, profileId: profileId || undefined }),
    enabled: debouncedQuery.length >= 2,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['search', 'suggest', query],
    queryFn: () => api.search.suggest(query),
    enabled: query.length >= 2,
  });

  const { data: recent = [] } = useQuery({
    queryKey: ['search', 'recent', profileId],
    queryFn: () => api.search.recent(profileId),
    enabled: !!profileId,
  });

  const items = results?.data ?? [];
  const showSuggestions = query.length >= 2 && suggestions.length > 0 && items.length === 0 && !isLoading;

  return (
    <div className="min-h-screen bg-stream-bg">
      <Header />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-24 px-6 md:px-12 pb-12"
      >
        {/* Search input */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mb-8"
        >
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stream-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="search"
              type="search"
              placeholder="Search titles, genres, actors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full glass rounded-xl pl-12 pr-4 py-4 text-white placeholder-stream-text-secondary focus:outline-none focus:ring-2 focus:ring-stream-accent/50 transition-all duration-300 text-lg"
              autoFocus
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stream-text-secondary hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </motion.div>

        {/* Suggestions */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8"
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-stream-accent rounded-full" />
                Suggestions
              </h2>
              <ul className="space-y-1">
                {suggestions.map((s, i) => (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={`/title/${s.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      {s.thumbnailUrl && (
                        <img
                          src={s.thumbnailUrl}
                          alt=""
                          className="w-14 h-9 object-cover rounded-md"
                        />
                      )}
                      <span className="font-medium">{s.title}</span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {query.length > 0 && query.length < 2 && (
          <p className="text-stream-text-secondary">Type at least 2 characters to search.</p>
        )}

        {debouncedQuery.length >= 2 && isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-video rounded-lg skeleton" />
                <div className="h-4 w-3/4 rounded skeleton" />
              </div>
            ))}
          </div>
        )}

        {debouncedQuery.length >= 2 && !isLoading && items.length === 0 && !showSuggestions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-stream-text-secondary text-lg">No results for &quot;{debouncedQuery}&quot;</p>
            <p className="text-stream-text-secondary/60 text-sm mt-1">Try different keywords</p>
          </motion.div>
        )}

        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-stream-accent rounded-full" />
              Results
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link href={`/title/${item.slug ?? item.id}`} className="group block">
                    <div className="aspect-video rounded-lg overflow-hidden bg-stream-dark-gray shadow-card card-shine group-hover:shadow-card-hover group-hover:scale-[1.05] transition-all duration-400">
                      <img
                        src={item.thumbnailUrl ?? item.posterUrl ?? ''}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-400"
                        loading="lazy"
                      />
                    </div>
                    <p className="mt-2 text-sm font-medium line-clamp-2 group-hover:text-stream-accent transition-colors">
                      {item.title}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {query.length === 0 && recent.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-stream-text-secondary/50 rounded-full" />
              Recent searches
            </h2>
            <div className="flex flex-wrap gap-2">
              {recent.map((q, i) => (
                <motion.button
                  key={q}
                  type="button"
                  onClick={() => setQuery(q)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  className="px-4 py-2 rounded-lg glass hover:bg-white/10 text-sm transition-colors"
                >
                  {q}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}
