'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type Content } from '@/lib/api';
import { useProfileStore } from '@/store/useProfileStore';
import { Header } from '@/components/layout/Header';

export default function MyListPage() {
  const { currentProfile } = useProfileStore();
  const queryClient = useQueryClient();

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['my-list', currentProfile?.id],
    queryFn: () => api.myList.list(currentProfile!.id),
    enabled: !!currentProfile?.id,
  });

  const removeMu = useMutation({
    mutationFn: (contentId: string) =>
      api.myList.remove(currentProfile!.id, contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-list', currentProfile?.id] });
    },
  });

  if (!currentProfile?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stream-bg">
        <p className="text-stream-text-secondary">Select a profile first.</p>
        <Link href="/profiles" className="ml-2 text-stream-accent hover:underline">
          Profiles
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stream-bg">
      <Header />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="pt-20 sm:pt-24 px-4 sm:px-6 md:px-12 pb-8 sm:pb-12"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6 sm:mb-8"
        >
          <span className="w-1.5 h-6 sm:h-8 bg-stream-accent rounded-full flex-shrink-0" />
          <h1 className="text-2xl sm:text-3xl font-bold">My List</h1>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-video rounded-lg skeleton" />
                <div className="h-4 w-3/4 rounded skeleton" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full glass flex items-center justify-center">
              <svg className="w-10 h-10 text-stream-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-stream-text-secondary text-lg mb-2">Your list is empty</p>
            <p className="text-stream-text-secondary/60 text-sm">Add titles from Browse or search</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <AnimatePresence>
              {(list as Content[]).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.04 }}
                  className="group"
                >
                  <Link href={`/title/${item.slug ?? item.id}`} className="block">
                    <div className="aspect-video rounded-lg overflow-hidden bg-stream-dark-gray shadow-card card-shine group-hover:shadow-card-hover group-hover:scale-[1.05] transition-all duration-400">
                      <img
                        src={item.thumbnailUrl ?? item.posterUrl ?? ''}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-400"
                        loading="lazy"
                      />
                    </div>
                    <p className="mt-2 text-sm font-medium line-clamp-2 group-hover:text-stream-accent transition-colors">{item.title}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      removeMu.mutate(item.id);
                    }}
                    disabled={removeMu.isPending}
                    className="mt-1 text-xs text-stream-text-secondary hover:text-stream-accent transition-colors"
                  >
                    Remove
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.main>
    </div>
  );
}
