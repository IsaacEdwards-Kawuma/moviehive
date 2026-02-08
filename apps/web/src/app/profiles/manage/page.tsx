'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export default function ManageProfilesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => api.profiles.list(),
  });

  const deleteMu = useMutation({
    mutationFn: (id: string) => api.profiles.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stream-bg">
        <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stream-bg px-6 py-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Manage Profiles</h1>
        <div className="space-y-4 mb-8">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between p-4 rounded bg-stream-dark-gray"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded bg-stream-gray flex items-center justify-center text-xl font-bold">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="" className="w-full h-full rounded object-cover" />
                  ) : (
                    profile.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="font-medium">{profile.name}</span>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/profiles/edit/${profile.id}`}
                  className="px-4 py-2 rounded border border-stream-gray hover:border-white text-sm"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete this profile?')) deleteMu.mutate(profile.id);
                  }}
                  disabled={deleteMu.isPending}
                  className="px-4 py-2 rounded border border-stream-accent text-stream-accent hover:bg-stream-accent hover:text-white text-sm disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/profiles"
          className="text-stream-text-secondary hover:text-white"
        >
          ← Back to profiles
        </Link>
      </div>
    </div>
  );
}
