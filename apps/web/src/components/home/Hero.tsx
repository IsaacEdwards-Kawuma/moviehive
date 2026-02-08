'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { ContentDetail } from '@/lib/api';

export function Hero({ featured }: { featured: ContentDetail | null | undefined }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (featured?.posterUrl || featured?.thumbnailUrl) {
      const img = new Image();
      img.src = featured.posterUrl ?? featured.thumbnailUrl ?? '';
      img.onload = () => setImageLoaded(true);
    }
  }, [featured?.posterUrl, featured?.thumbnailUrl]);

  if (!featured) {
    return (
      <div className="relative h-[56.25vw] min-h-[400px] max-h-[90vh] bg-stream-black overflow-hidden">
        {/* Animated skeleton */}
        <div className="absolute inset-0 skeleton" />
        <div className="absolute bottom-[15%] left-6 md:left-12 max-w-xl space-y-4">
          <div className="h-12 w-80 rounded skeleton" />
          <div className="h-4 w-96 rounded skeleton" />
          <div className="h-4 w-64 rounded skeleton" />
          <div className="flex gap-3 mt-6">
            <div className="h-11 w-32 rounded skeleton" />
            <div className="h-11 w-32 rounded skeleton" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="relative h-[56.25vw] min-h-[400px] max-h-[90vh] bg-stream-black overflow-hidden cinema-grain">
      {/* Background image with cinematic zoom */}
      <AnimatePresence>
        {imageLoaded && (
          <motion.div
            initial={{ opacity: 0, scale: 1.15 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <img
              src={featured.posterUrl ?? featured.thumbnailUrl ?? ''}
              alt=""
              className="w-full h-full object-cover animate-hero-zoom"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-layer gradient overlays for cinematic depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-stream-bg via-stream-bg/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-stream-bg/80 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-hero-vignette opacity-60" />

      {/* Subtle animated ambient glow */}
      <div className="absolute bottom-0 left-0 w-[600px] h-[300px] bg-stream-accent/5 rounded-full blur-[120px] animate-pulse-glow" />

      {/* Content overlay */}
      <div className="absolute bottom-[15%] left-6 md:left-12 max-w-xl z-10">
        <motion.div
          initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 text-glow-white leading-tight">
            {featured.title}
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="text-base md:text-lg text-stream-text-secondary/90 line-clamp-3 mb-6 max-w-md"
        >
          {featured.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex gap-3"
        >
          <Link
            href={`/watch/${featured.id}`}
            className="group flex items-center gap-2 bg-white text-stream-bg px-7 py-3 rounded-md font-semibold text-lg shadow-glow-white hover:bg-white/90 hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            <svg className="w-7 h-7 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Play
          </Link>
          <Link
            href={`/title/${featured.id}`}
            className="group flex items-center gap-2 glass px-7 py-3 rounded-md font-semibold text-lg hover:bg-white/10 hover:scale-105 transition-all duration-300"
          >
            <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            More Info
          </Link>
        </motion.div>
      </div>

      {/* Bottom fade for seamless transition to rows */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-cinematic-fade" />
    </section>
  );
}
