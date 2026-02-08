'use client';

import type { AdminAnalytics } from '@/lib/api';

export function AdminMonitoring({
  analytics,
  onRefresh,
}: {
  analytics: AdminAnalytics | null;
  onRefresh: () => void;
}) {
  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { overview, contentByType, recentContent, recentWatchActivity, topContentByWatches, recentSearches } = analytics;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Monitoring &amp; analytics</h1>
        <button
          type="button"
          onClick={onRefresh}
          className="text-stream-accent hover:underline text-sm"
        >
          Refresh
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-stream-dark-gray p-4 rounded">
            <div className="text-2xl font-bold">{overview.totalUsers}</div>
            <div className="text-stream-text-secondary text-sm">Users</div>
          </div>
          <div className="bg-stream-dark-gray p-4 rounded">
            <div className="text-2xl font-bold">{overview.totalContent}</div>
            <div className="text-stream-text-secondary text-sm">Content</div>
          </div>
          <div className="bg-stream-dark-gray p-4 rounded">
            <div className="text-2xl font-bold">{overview.totalWatchHistory}</div>
            <div className="text-stream-text-secondary text-sm">Watch events</div>
          </div>
          <div className="bg-stream-dark-gray p-4 rounded">
            <div className="text-2xl font-bold">{overview.totalProfiles}</div>
            <div className="text-stream-text-secondary text-sm">Profiles</div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Content by type</h2>
        <div className="bg-stream-dark-gray rounded p-4 flex gap-6">
          <div>
            <span className="text-stream-text-secondary">Movies:</span>{' '}
            <span className="font-bold">{contentByType.movie ?? 0}</span>
          </div>
          <div>
            <span className="text-stream-text-secondary">Series:</span>{' '}
            <span className="font-bold">{contentByType.series ?? 0}</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Top content by watches</h2>
        <div className="bg-stream-dark-gray rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-stream-black">
              <tr>
                <th className="p-3 text-left text-sm font-medium">Title</th>
                <th className="p-3 text-left text-sm font-medium">Type</th>
                <th className="p-3 text-left text-sm font-medium">Watch count</th>
              </tr>
            </thead>
            <tbody>
              {topContentByWatches.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-stream-text-secondary text-sm">
                    No watch data yet
                  </td>
                </tr>
              ) : (
                topContentByWatches.map((c) => (
                  <tr key={c.id} className="border-t border-stream-gray">
                    <td className="p-3">{c.title}</td>
                    <td className="p-3 capitalize">{c.type}</td>
                    <td className="p-3">{c.watchCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent content added</h2>
          <ul className="bg-stream-dark-gray rounded divide-y divide-stream-gray">
            {recentContent.length === 0 ? (
              <li className="p-4 text-stream-text-secondary text-sm">None</li>
            ) : (
              recentContent.map((c) => (
                <li key={c.id} className="p-3 flex items-center gap-3">
                  {c.thumbnailUrl && (
                    <img src={c.thumbnailUrl} alt="" className="w-12 h-8 object-cover rounded" />
                  )}
                  <div>
                    <span className="font-medium">{c.title}</span>
                    <span className="text-stream-text-secondary text-sm ml-2 capitalize">{c.type}</span>
                    <span className="text-stream-text-secondary text-xs block">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Recent watch activity</h2>
          <ul className="bg-stream-dark-gray rounded divide-y divide-stream-gray max-h-80 overflow-y-auto">
            {recentWatchActivity.length === 0 ? (
              <li className="p-4 text-stream-text-secondary text-sm">None</li>
            ) : (
              recentWatchActivity.map((w) => (
                <li key={w.id} className="p-3 text-sm">
                  <span className="font-medium">{w.profile.name}</span>
                  <span className="text-stream-text-secondary"> watched </span>
                  <span className="font-medium">{w.content.title}</span>
                  <span className="text-stream-text-secondary text-xs block">
                    {new Date(w.watchedAt).toLocaleString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent searches</h2>
        <div className="bg-stream-dark-gray rounded p-4">
          {recentSearches.length === 0 ? (
            <p className="text-stream-text-secondary text-sm">No searches yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((q, i) => (
                <span
                  key={`${q}-${i}`}
                  className="px-3 py-1 rounded bg-stream-black text-sm"
                >
                  {q}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
