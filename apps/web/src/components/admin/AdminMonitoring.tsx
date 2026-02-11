'use client';

import type { AdminAnalytics, AdminHealthSummary } from '@/lib/api';

function secondsToHms(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}

export function AdminMonitoring({
  analytics,
  health,
  onRefresh,
}: {
  analytics: AdminAnalytics | null;
  health: AdminHealthSummary | null;
  onRefresh: () => void;
}) {
  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const {
    overview,
    contentByType,
    recentContent,
    recentWatchActivity,
    topContentByWatches,
    recentSearches,
    watchByDay,
    topContentByWatchTime,
    topGenresByWatchCount,
    signupsByDay,
    kidsVsRegularWatchSeconds,
  } = analytics;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Monitoring &amp; analytics</h1>
        <button
          type="button"
          onClick={onRefresh}
          className="text-stream-accent hover:underline text-sm self-start sm:self-auto"
        >
          Refresh
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">User signups (last 30 days)</h2>
          <div className="bg-stream-dark-gray rounded p-4">
            {signupsByDay.length === 0 ? (
              <p className="text-stream-text-secondary text-sm">No signups yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(() => {
                  const max = Math.max(...signupsByDay.map((d) => d.count), 1);
                  return signupsByDay.map((d) => (
                    <div key={d.date} className="flex items-center gap-3 text-xs sm:text-sm">
                      <span className="w-16 text-stream-text-secondary">{d.date.slice(5)}</span>
                      <div className="flex-1 h-2 rounded bg-stream-black overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400/70 to-emerald-400"
                          style={{ width: `${(d.count / max) * 100 || 4}%` }}
                        />
                      </div>
                      <span className="w-8 text-right">{d.count}</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Watch time: kids vs regular profiles</h2>
          <div className="bg-stream-dark-gray rounded p-4 grid grid-cols-2 gap-4">
            <div className="bg-stream-black rounded p-3">
              <p className="text-xs text-stream-text-secondary mb-1">Kids profiles</p>
              <p className="text-lg font-bold">
                {secondsToHms(kidsVsRegularWatchSeconds.kids)}
              </p>
            </div>
            <div className="bg-stream-black rounded p-3">
              <p className="text-xs text-stream-text-secondary mb-1">Regular profiles</p>
              <p className="text-lg font-bold">
                {secondsToHms(kidsVsRegularWatchSeconds.regular)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">System health</h2>
        <div className="bg-stream-dark-gray rounded p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-stream-black rounded p-3 flex flex-col gap-1">
            <p className="text-xs text-stream-text-secondary">API process</p>
            <p className="text-sm">
              Status:{' '}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {health?.app.status ?? 'unknown'}
              </span>
            </p>
            {health && (
              <p className="text-xs text-stream-text-secondary">
                Uptime: {secondsToHms(health.app.uptimeSeconds)}
              </p>
            )}
          </div>
          <div className="bg-stream-black rounded p-3 flex flex-col gap-1">
            <p className="text-xs text-stream-text-secondary">Database</p>
            <p className="text-sm">
              Status:{' '}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                  health?.db.status === 'error'
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    health?.db.status === 'error' ? 'bg-red-400' : 'bg-emerald-400'
                  }`}
                />
                {health?.db.status ?? 'unknown'}
              </span>
            </p>
            {health?.db.error && (
              <p className="text-[11px] text-red-300/80 mt-1 line-clamp-2">
                {health.db.error}
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Content by type</h2>
        <div className="bg-stream-dark-gray rounded p-4 flex flex-wrap gap-4 sm:gap-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Watch activity (last 7 days)</h2>
          <div className="bg-stream-dark-gray rounded p-4">
            {watchByDay.length === 0 ? (
              <p className="text-stream-text-secondary text-sm">No watch data yet</p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(...watchByDay.map((d) => d.count), 1);
                  return watchByDay.map((d) => (
                    <div key={d.date} className="flex items-center gap-3 text-xs sm:text-sm">
                      <span className="w-16 text-stream-text-secondary">{d.date.slice(5)}</span>
                      <div className="flex-1 h-2 rounded bg-stream-black overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-stream-accent/70 to-stream-accent"
                          style={{ width: `${(d.count / max) * 100 || 4}%` }}
                        />
                      </div>
                      <span className="w-8 text-right">{d.count}</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Top genres by watches</h2>
          <div className="bg-stream-dark-gray rounded p-4">
            {topGenresByWatchCount.length === 0 ? (
              <p className="text-stream-text-secondary text-sm">No genre watch data yet</p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(...topGenresByWatchCount.map((g) => g.watchCount), 1);
                  return topGenresByWatchCount.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 text-xs sm:text-sm">
                      <span className="min-w-[72px] sm:min-w-[96px] font-medium truncate">{g.name}</span>
                      <div className="flex-1 h-2 rounded bg-stream-black overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500/70 to-blue-400"
                          style={{ width: `${(g.watchCount / max) * 100 || 4}%` }}
                        />
                      </div>
                      <span className="w-10 text-right">{g.watchCount}</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Top content by watches</h2>
        <div className="bg-stream-dark-gray rounded overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[280px]">
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
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Top content by watch time</h2>
        <div className="bg-stream-dark-gray rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px]">
              <thead className="bg-stream-black">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">Title</th>
                  <th className="p-3 text-left text-sm font-medium">Type</th>
                  <th className="p-3 text-left text-sm font-medium">Total watch time</th>
                  <th className="p-3 text-left text-sm font-medium">Events</th>
                </tr>
              </thead>
              <tbody>
                {topContentByWatchTime.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-stream-text-secondary text-sm">
                      No watch time data yet
                    </td>
                  </tr>
                ) : (
                  topContentByWatchTime.map((c) => (
                    <tr key={c.id} className="border-t border-stream-gray">
                      <td className="p-3">{c.title}</td>
                      <td className="p-3 capitalize">{c.type}</td>
                      <td className="p-3 text-sm">{secondsToHms(c.totalSeconds)}</td>
                      <td className="p-3 text-sm">{c.watchCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
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
