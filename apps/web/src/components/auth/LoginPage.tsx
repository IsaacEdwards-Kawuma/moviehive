'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { LogoIcon } from '@/components/Logo';

const CINEMATIC_IMAGES = [
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&q=80',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&q=80',
  'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1920&q=80',
];

export function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const setAuth = useAuthStore((s) => s.setAuth);

  // Cycle background images
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % CINEMATIC_IMAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const loginMu = useMutation({
    mutationFn: () => api.auth.login(email, password),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken ?? null);
      if (data.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    },
    onError: (err: Error) => setError(err.message),
  });

  const registerMu = useMutation({
    mutationFn: () => api.auth.register(email, password),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken ?? null);
      if (data.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/profiles');
      }
    },
    onError: (err: Error) => setError(err.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isLogin) loginMu.mutate();
    else registerMu.mutate();
  };

  const loading = loginMu.isPending || registerMu.isPending;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Cinematic background slideshow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={bgIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="absolute inset-0 z-0"
        >
          <img
            src={CINEMATIC_IMAGES[bgIndex]}
            alt=""
            className="w-full h-full object-cover animate-hero-zoom"
          />
        </motion.div>
      </AnimatePresence>

      {/* Cinematic overlay */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black via-black/70 to-black/40" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/60 via-transparent to-black/60" />

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-stream-accent/8 rounded-full blur-[150px] z-[1]" />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="p-6 relative z-10"
      >
        <Link href="/" className="inline-flex items-center gap-3 text-stream-accent font-bold text-3xl text-glow tracking-wide">
          <LogoIcon className="w-10 h-10" />
          <span>MOVI HIVE</span>
        </Link>
        <p className="text-stream-text-secondary text-sm mt-1">Movies, Anytime, Anywhere</p>
      </motion.header>

      {/* Form card */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:py-8 relative z-10 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md glass rounded-2xl p-6 sm:p-8 md:p-10 shadow-2xl my-auto"
        >
          <motion.h1
            key={isLogin ? 'signin' : 'signup'}
            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8"
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </motion.h1>

          <form onSubmit={submit} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3.5 text-white placeholder-stream-text-secondary focus:outline-none focus:ring-2 focus:ring-stream-accent focus:border-transparent backdrop-blur-sm transition-all duration-300"
                required
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3.5 text-white placeholder-stream-text-secondary focus:outline-none focus:ring-2 focus:ring-stream-accent focus:border-transparent backdrop-blur-sm transition-all duration-300"
                required
                minLength={isLogin ? 1 : 8}
              />
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-stream-accent text-sm bg-stream-accent/10 px-3 py-2 rounded-lg"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-stream-accent text-white font-semibold py-3.5 rounded-lg hover:bg-red-600 transition-all duration-300 disabled:opacity-50 shadow-glow-red hover:shadow-[0_0_30px_rgba(229,9,20,0.5)]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Please wait...
                </span>
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Sign Up'
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 flex items-center gap-4"
          >
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-stream-text-secondary text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </motion.div>

          {/* Sign in or Sign up with Google / Gmail */}
          <motion.a
            href="/api/server/auth/google"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-4 w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white font-medium py-3.5 rounded-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>{isLogin ? 'Sign in with Google' : 'Sign up with Google'}</span>
          </motion.a>
          <p className="text-stream-text-secondary text-xs text-center mt-2">
            {isLogin ? "New? We'll create your account." : 'Use your Gmail or any Google account.'}
          </p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-stream-text-secondary text-sm text-center"
          >
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-white hover:text-stream-accent hover:underline transition-colors font-medium"
            >
              {isLogin ? 'Sign up now' : 'Sign in'}
            </button>
          </motion.p>
        </motion.div>
      </div>

      {/* Bottom film strip decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-stream-accent/50 to-transparent z-10" />
    </div>
  );
}
