'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '@/store/useProfileStore';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { LogoIcon } from '@/components/Logo';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse' },
  { href: '/my-list', label: 'My List' },
  { href: '/downloads', label: 'Downloads' },
];

const adminNav = { href: '/admin', label: 'Admin' };

type NotifItem = { id: string; type: string; title: string; body: string | null; read: boolean; link: string | null; createdAt: string };

export function Header() {
  const pathname = usePathname();
  const { currentProfile } = useProfileStore();
  const { user, logout } = useAuthStore();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Scroll detection for header backdrop
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchUnread = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { count } = await api.notifications.unreadCount();
      setUnreadCount(count);
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const openNotifications = async () => {
    setNotifOpen(true);
    setNotifLoading(true);
    try {
      const list = await api.notifications.list({ limit: 15 });
      setNotifications(list);
    } catch {}
    setNotifLoading(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {}
    logout();
    useProfileStore.getState().setCurrentProfile(null);
    window.location.href = '/';
  };

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 transition-all duration-500 ${
        scrolled
          ? 'glass shadow-lg'
          : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <LogoIcon className="w-9 h-9 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-stream-accent font-bold text-2xl tracking-wider group-hover:text-glow transition-all duration-300 group-hover:tracking-widest">
              MOVI HIVE
            </span>
            <span className="text-[10px] md:text-xs text-stream-text-secondary tracking-wide -mt-0.5">
              Movies, Anytime, Anywhere
            </span>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`relative text-sm font-medium px-3 py-2 rounded-lg transition-all duration-300 ${
                pathname === href
                  ? 'text-white bg-white/10'
                  : 'text-stream-text-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
              {pathname === href && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-stream-accent rounded-full"
                />
              )}
            </Link>
          ))}
          {user?.role === 'ADMIN' && (
            <Link
              href={adminNav.href}
              className={`text-sm font-medium px-3 py-2 rounded-lg transition-all duration-300 ${
                pathname === adminNav.href
                  ? 'text-stream-accent bg-stream-accent/10'
                  : 'text-stream-text-secondary hover:text-stream-accent hover:bg-stream-accent/5'
              }`}
            >
              {adminNav.label}
            </Link>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <Link
          href="/search"
          className="p-2.5 rounded-lg text-stream-text-secondary hover:text-white hover:bg-white/5 transition-all duration-300"
          aria-label="Search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </Link>

        {/* Notification bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (notifOpen) setNotifOpen(false);
              else openNotifications();
            }}
            className="p-2.5 rounded-lg text-stream-text-secondary hover:text-white hover:bg-white/5 transition-all duration-300 relative"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-stream-accent text-white text-[10px] font-bold flex items-center justify-center shadow-glow-red"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <AnimatePresence>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-80 max-h-[70vh] glass rounded-xl shadow-2xl z-20 flex flex-col overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    <div className="flex gap-3">
                      {unreadCount > 0 && (
                        <button type="button" onClick={handleMarkAllRead} className="text-xs text-stream-accent hover:underline">
                          Mark all read
                        </button>
                      )}
                      <Link
                        href="/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs text-stream-text-secondary hover:text-white transition"
                      >
                        View all
                      </Link>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-stream-accent border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className="text-stream-text-secondary text-sm text-center py-8">No notifications yet</p>
                    ) : (
                      notifications.map((n, i) => (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={`px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${
                            !n.read ? 'bg-stream-accent/5' : ''
                          }`}
                          onClick={() => {
                            if (!n.read) handleMarkRead(n.id);
                            setNotifOpen(false);
                            if (n.link) window.location.href = n.link;
                          }}
                        >
                          <div className="flex items-start gap-2">
                            {!n.read && <span className="w-2 h-2 mt-1.5 rounded-full bg-stream-accent flex-shrink-0 animate-pulse" />}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium line-clamp-1">{n.title}</p>
                              {n.body && <p className="text-xs text-stream-text-secondary line-clamp-2 mt-0.5">{n.body}</p>}
                              <p className="text-[10px] text-stream-text-secondary mt-1">{timeAgo(n.createdAt)}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Profile menu */}
        <div className="relative">
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-stream-accent"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-stream-accent/50 to-stream-dark-gray flex items-center justify-center text-sm font-bold overflow-hidden ring-2 ring-transparent hover:ring-stream-accent/50 transition-all">
              {currentProfile?.avatar ? (
                <img src={currentProfile.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                (currentProfile?.name ?? user?.email ?? '?').charAt(0).toUpperCase()
              )}
            </div>
            <svg className={`w-4 h-4 text-stream-text-secondary transition-transform duration-300 ${profileMenuOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          <AnimatePresence>
            {profileMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-48 py-2 glass rounded-xl shadow-2xl z-20 overflow-hidden"
                >
                  <Link
                    href="/profiles"
                    className="block px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    Manage Profiles
                  </Link>
                  <Link
                    href="/account"
                    className="block px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    Account
                  </Link>
                  <div className="my-1 border-t border-white/10" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 text-stream-text-secondary hover:text-white transition-colors"
                  >
                    Sign out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
