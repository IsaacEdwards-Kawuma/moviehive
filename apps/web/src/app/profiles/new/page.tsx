'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

export default function NewProfilePage() {
  const router = useRouter();
  const { user, accessToken, isHydrated } = useAuthStore();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isHydrated && !user?.id) router.replace('/');
  }, [isHydrated, user?.id, router]);

  const createMu = useMutation({
    mutationFn: () => api.profiles.create({ name: name.trim() }),
    onSuccess: () => router.push('/profiles'),
    onError: (err: Error) => setError(err.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    createMu.mutate();
  };

  if (!isHydrated || !user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stream-bg">
        <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stream-bg px-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8">Add Profile</h1>
        <form onSubmit={submit} className="space-y-6">
          <input
            type="text"
            placeholder="Profile name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-stream-dark-gray border border-stream-gray rounded px-4 py-3 text-white placeholder-stream-text-secondary focus:outline-none focus:ring-2 focus:ring-stream-accent"
            maxLength={100}
          />
          {error && <p className="text-stream-accent text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createMu.isPending}
              className="flex-1 bg-stream-accent text-white font-semibold py-3 rounded hover:bg-red-600 transition disabled:opacity-50"
            >
              {createMu.isPending ? 'Creating...' : 'Create'}
            </button>
            <Link
              href="/profiles"
              className="flex-1 bg-stream-dark-gray text-white font-semibold py-3 rounded text-center hover:bg-stream-gray transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
