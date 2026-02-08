'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

export default function EditProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const list = await api.profiles.list();
      return list.find((p) => p.id === id) ?? null;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  const updateMu = useMutation({
    mutationFn: () => api.profiles.update(id, { name: name.trim() }),
    onSuccess: () => router.push('/profiles/manage'),
    onError: (err: Error) => setError(err.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    updateMu.mutate();
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stream-bg">
        <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stream-bg px-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>
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
              disabled={updateMu.isPending}
              className="flex-1 bg-stream-accent text-white font-semibold py-3 rounded hover:bg-red-600 transition disabled:opacity-50"
            >
              {updateMu.isPending ? 'Saving...' : 'Save'}
            </button>
            <Link
              href="/profiles/manage"
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
