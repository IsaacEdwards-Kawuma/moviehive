'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import type { Content } from '@/lib/api';

type Item = Content & { progress?: number; episode?: { season: number; episode: number } | null };

export function ContentRow({
  title,
  items,
  progress = false,
}: {
  title: string;
  items: Item[];
  progress?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-50px' });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  if (items.length === 0) return null;

  return (
    <section ref={sectionRef} className="py-6 pl-6 md:pl-12 overflow-hidden">
      {/* Animated section title */}
      <motion.h2
        initial={{ opacity: 0, x: -30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="text-xl font-bold mb-4 flex items-center gap-3"
      >
        <span className="w-1 h-6 bg-stream-accent rounded-full inline-block" />
        {title}
      </motion.h2>

      <div className="relative group">
        {/* Scroll buttons with glow */}
        <button
          type="button"
          onClick={() => scroll('left')}
          className={`absolute left-0 top-0 bottom-0 z-10 w-14 flex items-center justify-center bg-gradient-to-r from-stream-bg to-transparent transition-all duration-300 cursor-pointer ${
            canScrollLeft ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-label="Scroll left"
        >
          <span className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </span>
        </button>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto overflow-y-hidden scroll-smooth pr-12"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.5, ease: 'easeOut' }}
              className="flex-shrink-0 w-[180px] md:w-[240px]"
            >
              <Link href={`/title/${item.id}`} className="block group/card">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-stream-dark-gray shadow-card card-shine transition-all duration-400 group-hover/card:shadow-card-hover group-hover/card:scale-[1.08] group-hover/card:z-10">
                  <img
                    src={item.thumbnailUrl ?? item.posterUrl ?? ''}
                    alt={item.title}
                    className="w-full h-full object-cover transition-all duration-600 group-hover/card:brightness-110"
                    loading="lazy"
                  />

                  {/* Red accent border on hover */}
                  <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover/card:border-stream-accent/50 transition-all duration-300" />

                  {/* Progress bar */}
                  {progress && typeof item.progress === 'number' && item.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-stream-dark-gray/80">
                      <div
                        className="h-full bg-stream-accent shadow-glow-red transition-all duration-300"
                        style={{ width: `${Math.min(100, (item.progress / 3600) * 100)}%` }}
                      />
                    </div>
                  )}

                  {/* Episode badge */}
                  {item.episode && (
                    <span className="absolute bottom-2 left-2 text-xs glass px-2 py-0.5 rounded-md font-medium">
                      S{item.episode.season} E{item.episode.episode}
                    </span>
                  )}

                  {/* Play icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-300 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                    <motion.span
                      whileHover={{ scale: 1.15 }}
                      className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center text-stream-bg shadow-glow-white"
                    >
                      <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </motion.span>
                  </div>
                </div>

                <p className="mt-2 text-sm font-medium line-clamp-2 group-hover/card:text-stream-accent transition-colors duration-300">
                  {item.title}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scroll('right')}
          className={`absolute right-0 top-0 bottom-0 z-10 w-14 flex items-center justify-center bg-gradient-to-l from-stream-bg to-transparent transition-all duration-300 cursor-pointer ${
            canScrollRight ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-label="Scroll right"
        >
          <span className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </span>
        </button>
      </div>
    </section>
  );
}
