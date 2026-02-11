'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import api, { type AdminContent, type AdminContentCreate, type AdminAnalytics, type AdminHealthSummary } from '@/lib/api';
import { AdminContentForm } from '@/components/admin/AdminContentForm';
import { AdminMonitoring } from '@/components/admin/AdminMonitoring';
import { LogoIcon } from '@/components/Logo';

type Tab = 'overview' | 'users' | 'content' | 'monitoring';
type AdminUser = {
  id: string;
  email: string;
  role: string;
  subscriptionTier: string;
  disabled: boolean;
  createdAt: string;
  _count: { profiles: number };
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<{ totalUsers: number; totalContent: number; totalWatchHistory: number; totalProfiles: number } | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [contentList, setContentList] = useState<AdminContent[]>([]);
  const [contentPage, setContentPage] = useState(1);
  const [contentTotal, setContentTotal] = useState(0);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [health, setHealth] = useState<AdminHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [contentFormOpen, setContentFormOpen] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [userPlanFilter, setUserPlanFilter] = useState<'ALL' | 'free' | 'basic' | 'standard' | 'premium' | 'avod'>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [contentSearch, setContentSearch] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<'ALL' | 'movie' | 'series'>('ALL');
  const [contentMissingVideoOnly, setContentMissingVideoOnly] = useState(false);

  const loadOverview = async () => {
    const [statsRes, usersRes] = await Promise.all([api.admin.getStats(), api.admin.getUsers()]);
    setStats(statsRes);
    setUsers(usersRes);
  };

  const loadContent = async (page = 1) => {
    const res = await api.admin.getContentList({ page, limit: 15 });
    setContentList(res.data);
    setContentTotal(res.total);
    setContentPage(res.page);
  };

  const loadAnalytics = async () => {
    const data = await api.admin.getAnalytics();
    setAnalytics(data);
  };

  const loadHealth = async () => {
    const data = await api.admin.getHealthSummary();
    setHealth(data);
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (user?.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    const run = async () => {
      try {
        await loadOverview();
      } catch {
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user?.role, isHydrated, router]);

  useEffect(() => {
    if (tab === 'content' && user?.role === 'ADMIN') loadContent(contentPage);
  }, [tab, contentPage]);

  useEffect(() => {
    if (tab === 'monitoring' && user?.role === 'ADMIN') {
      loadAnalytics();
      loadHealth();
    }
  }, [tab]);

  const handleRoleChange = async (id: string, role: string) => {
    if (!['USER', 'ADMIN'].includes(role)) return;
    setUpdatingId(id);
    try {
      const updated = await api.admin.updateUserRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: updated.role } : u)));
    } catch {
      const list = await api.admin.getUsers();
      setUsers(list);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('Delete this content? This cannot be undone.')) return;
    try {
      await api.admin.deleteContent(id);
      setContentList((prev) => prev.filter((c) => c.id !== id));
      setContentTotal((t) => Math.max(0, t - 1));
      setSelectedContentIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const handleBulkDeleteContent = async () => {
    if (selectedContentIds.size === 0) return;
    if (!confirm(`Delete ${selectedContentIds.size} item(s)? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await api.admin.bulkDeleteContent([...selectedContentIds]);
      setSelectedContentIds(new Set());
      await loadContent(contentPage);
      loadOverview();
    } catch {
      alert('Failed to delete some or all items.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleContentSelection = (id: string) => {
    setSelectedContentIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAllContentOnPage = () => {
    const allSelected = contentList.every((c) => selectedContentIds.has(c.id));
    if (allSelected) {
      setSelectedContentIds((prev) => {
        const n = new Set(prev);
        contentList.forEach((c) => n.delete(c.id));
        return n;
      });
    } else {
      setSelectedContentIds((prev) => {
        const n = new Set(prev);
        contentList.forEach((c) => n.add(c.id));
        return n;
      });
    }
  };

  const handleContentSaved = () => {
    setContentFormOpen(false);
    setEditingContentId(null);
    loadContent(contentPage);
    loadOverview();
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (q && !u.email.toLowerCase().includes(q)) return false;
    if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
    if (userPlanFilter !== 'ALL' && u.subscriptionTier !== userPlanFilter) return false;
    if (userStatusFilter === 'ACTIVE' && u.disabled) return false;
    if (userStatusFilter === 'DISABLED' && !u.disabled) return false;
    return true;
  });

  const filteredContent = contentList.filter((c) => {
    const q = contentSearch.trim().toLowerCase();
    if (q && !c.title.toLowerCase().includes(q)) return false;
    if (contentTypeFilter !== 'ALL' && c.type !== contentTypeFilter) return false;
    if (contentMissingVideoOnly) {
      // AdminContent includes videoUrl via AdminContentDetail type; treat missing/empty as \"missing\"
      // @ts-expect-error videoUrl is present on AdminContentDetail
      const v = c.videoUrl as string | null | undefined;
      if (v && v.trim().length > 0) return false;
    }
    return true;
  });

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-stream-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user?.role !== 'ADMIN') return null;
  if (loading) {
    return (
      <div className="min-h-screen bg-stream-bg flex items-center justify-center pt-24">
        <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'content', label: 'Content' },
    { id: 'monitoring', label: 'Monitoring' },
  ];

  return (
    <div className="min-h-screen bg-stream-bg text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-stream-bg/95 border-b border-stream-dark-gray">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2">
            <LogoIcon className="w-8 h-8" />
            <div>
              <Link href="/" className="text-stream-accent font-bold text-2xl block leading-tight">
                MOVI HIVE
              </Link>
              <span className="text-xs text-stream-text-secondary">Admin dashboard</span>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs sm:text-sm text-stream-text-secondary hover:text-white whitespace-nowrap"
          >
            ← Back to app
          </Link>
        </div>
      </header>

      <main className="pt-20 sm:pt-24 pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
          {/* Sidebar navigation */}
          <aside className="md:w-56 flex-shrink-0">
            <nav className="bg-stream-dark-gray/80 border border-stream-dark-gray rounded-xl p-3 sm:p-4 space-y-1 sticky top-24">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                    tab === t.id
                      ? 'bg-stream-accent text-white'
                      : 'text-stream-text-secondary hover:bg-stream-black hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main panel */}
          <section className="flex-1">
        {tab === 'overview' && (
          <>
            <h1 className="text-3xl font-bold mb-8 text-stream-accent">Admin Dashboard</h1>
            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-stream-dark-gray p-4 rounded">
                <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
                <div className="text-stream-text-secondary text-sm">Total Users</div>
              </div>
              <div className="bg-stream-dark-gray p-4 rounded">
                <div className="text-2xl font-bold">{stats?.totalContent ?? 0}</div>
                <div className="text-stream-text-secondary text-sm">Total Content</div>
              </div>
              <div className="bg-stream-dark-gray p-4 rounded">
                <div className="text-2xl font-bold">{stats?.totalWatchHistory ?? 0}</div>
                <div className="text-stream-text-secondary text-sm">Watch History</div>
              </div>
              <div className="bg-stream-dark-gray p-4 rounded">
                <div className="text-2xl font-bold">{stats?.totalProfiles ?? 0}</div>
                <div className="text-stream-text-secondary text-sm">Total Profiles</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Quick actions */}
              <div className="bg-stream-dark-gray rounded p-5 space-y-3">
                <h2 className="text-lg font-semibold mb-1">Quick actions</h2>
                <p className="text-stream-text-secondary text-sm mb-3">
                  Jump straight to common admin tasks.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTab('users')}
                    className="px-3 py-2 rounded bg-stream-black text-sm hover:bg-white/5 transition-colors"
                  >
                    Manage users
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('content')}
                    className="px-3 py-2 rounded bg-stream-black text-sm hover:bg-white/5 transition-colors"
                  >
                    Manage content
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('monitoring')}
                    className="px-3 py-2 rounded bg-stream-black text-sm hover:bg-white/5 transition-colors"
                  >
                    Monitoring &amp; analytics
                  </button>
                </div>
              </div>

              {/* Needs attention */}
              <div className="bg-stream-dark-gray rounded p-5 space-y-3">
                <h2 className="text-lg font-semibold mb-1">Needs attention</h2>
                <p className="text-stream-text-secondary text-sm">
                  A quick glance at things worth checking.
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-stream-text-secondary">Disabled users</span>
                    <span className="font-semibold">
                      {users.filter((u) => u.disabled).length}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-stream-text-secondary">Content with missing video URL (this page)</span>
                    <span className="font-semibold">
                      {contentList.filter((c) => !('videoUrl' in c) || !c.videoUrl).length}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-stream-text-secondary">System health</span>
                    <button
                      type="button"
                      onClick={() => setTab('monitoring')}
                      className="text-stream-accent hover:underline text-xs"
                    >
                      View in Monitoring
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-stream-text-secondary text-sm">
              Use the navigation on the left to drill into users, content, and detailed monitoring. This overview stays focused on
              the big picture and quick access to what matters most.
            </p>
          </>
        )}

        {tab === 'users' && (
          <>
            <h1 className="text-2xl font-bold mb-4 sm:mb-6">Users</h1>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <input
                type="search"
                placeholder="Search by email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full sm:max-w-xs bg-stream-dark-gray border border-stream-gray rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stream-accent"
              />
              <div className="flex flex-wrap gap-2 text-sm">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as typeof userRoleFilter)}
                  className="bg-stream-dark-gray border border-stream-gray rounded px-2 py-1"
                >
                  <option value="ALL">All roles</option>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <select
                  value={userPlanFilter}
                  onChange={(e) => setUserPlanFilter(e.target.value as typeof userPlanFilter)}
                  className="bg-stream-dark-gray border border-stream-gray rounded px-2 py-1"
                >
                  <option value="ALL">All plans</option>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="avod">AVOD</option>
                </select>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as typeof userStatusFilter)}
                  className="bg-stream-dark-gray border border-stream-gray rounded px-2 py-1"
                >
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>
            </div>
            <div className="bg-stream-dark-gray rounded overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-stream-black">
                  <tr>
                    <th className="p-4 text-left text-sm font-medium">Email</th>
                    <th className="p-4 text-left text-sm font-medium">Role</th>
                    <th className="p-4 text-left text-sm font-medium">Plan</th>
                    <th className="p-4 text-left text-sm font-medium">Status</th>
                    <th className="p-4 text-left text-sm font-medium">Profiles</th>
                    <th className="p-4 text-left text-sm font-medium">Joined</th>
                    <th className="p-4 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-t border-stream-gray">
                      <td className="p-4">{u.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-sm ${u.role === 'ADMIN' ? 'bg-stream-accent text-white' : 'bg-stream-gray text-stream-text-secondary'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-stream-text-secondary text-sm capitalize">{u.subscriptionTier}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            u.disabled ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/15 text-emerald-200'
                          }`}
                        >
                          {u.disabled ? 'DISABLED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-4">{u._count.profiles}</td>
                      <td className="p-4 text-stream-text-secondary text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 flex flex-wrap items-center gap-2">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={updatingId === u.id || u.id === user?.id}
                          className="bg-stream-black border border-stream-gray rounded px-2 py-1 text-sm focus:ring-2 focus:ring-stream-accent disabled:opacity-50"
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <button
                          type="button"
                          onClick={async () => {
                            const targetDisabled = !u.disabled;
                            const confirmMsg = targetDisabled
                              ? 'Disable this account and log out all active sessions?'
                              : 'Re-enable this account?';
                            if (!confirm(confirmMsg)) return;
                            try {
                              const updated = await api.admin.updateUserStatus(u.id, targetDisabled, targetDisabled);
                              setUsers((prev) =>
                                prev.map((usr) =>
                                  usr.id === u.id ? { ...usr, disabled: updated.disabled } : usr
                                )
                              );
                            } catch {
                              alert('Failed to update user status');
                            }
                          }}
                          disabled={u.id === user?.id}
                          className={`px-2 py-1 rounded text-xs font-medium border ${
                            u.disabled
                              ? 'border-emerald-400 text-emerald-300 hover:bg-emerald-500/10'
                              : 'border-red-400 text-red-300 hover:bg-red-500/10'
                          } disabled:opacity-40`}
                        >
                          {u.disabled ? 'Enable' : 'Disable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}

        {tab === 'content' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h1 className="text-2xl font-bold">Content</h1>
              <div className="flex flex-wrap items-center gap-2">
                {selectedContentIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkDeleteContent}
                    disabled={bulkDeleting}
                    className="bg-red-600 text-white px-4 py-2 rounded font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {bulkDeleting ? 'Deleting…' : `Delete selected (${selectedContentIds.size})`}
                  </button>
                )}
                <input
                  type="search"
                  placeholder="Search title…"
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                  className="bg-stream-black border border-stream-gray rounded px-3 py-1.5 text-sm"
                />
                <select
                  value={contentTypeFilter}
                  onChange={(e) => setContentTypeFilter(e.target.value as typeof contentTypeFilter)}
                  className="bg-stream-black border border-stream-gray rounded px-2 py-1 text-sm"
                >
                  <option value="ALL">All types</option>
                  <option value="movie">Movies</option>
                  <option value="series">Series</option>
                </select>
                <label className="flex items-center gap-1 text-xs sm:text-sm text-stream-text-secondary">
                  <input
                    type="checkbox"
                    checked={contentMissingVideoOnly}
                    onChange={(e) => setContentMissingVideoOnly(e.target.checked)}
                    className="rounded border-stream-gray"
                  />
                  Missing video URL
                </label>
                <button
                  type="button"
                  onClick={() => { setEditingContentId(null); setContentFormOpen(true); }}
                  className="bg-stream-accent text-white px-4 py-2 rounded font-medium hover:bg-red-600"
                >
                  + Add content
                </button>
              </div>
            </div>
            <div className="bg-stream-dark-gray rounded overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-stream-black">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={contentList.length > 0 && contentList.every((c) => selectedContentIds.has(c.id))}
                        onChange={selectAllContentOnPage}
                        aria-label="Select all on page"
                        className="rounded border-stream-gray"
                      />
                    </th>
                    <th className="p-4 text-left text-sm font-medium">Title</th>
                    <th className="p-4 text-left text-sm font-medium">Type</th>
                    <th className="p-4 text-left text-sm font-medium">Year</th>
                    <th className="p-4 text-left text-sm font-medium">Watches</th>
                    <th className="p-4 text-left text-sm font-medium">Episodes</th>
                    <th className="p-4 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContent.map((c) => (
                    <tr key={c.id} className="border-t border-stream-gray">
                      <td className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedContentIds.has(c.id)}
                          onChange={() => toggleContentSelection(c.id)}
                          aria-label={`Select ${c.title}`}
                          className="rounded border-stream-gray"
                        />
                      </td>
                      <td className="p-4 font-medium">{c.title}</td>
                      <td className="p-4 capitalize">{c.type}</td>
                      <td className="p-4 text-stream-text-secondary">{c.releaseYear ?? '—'}</td>
                      <td className="p-4">{c._count?.watchHistory ?? 0}</td>
                      <td className="p-4">{c.type === 'series' ? (c._count?.episodes ?? 0) : '—'}</td>
                      <td className="p-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setEditingContentId(c.id); setContentFormOpen(true); }}
                          className="text-stream-accent hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContent(c.id)}
                          className="text-red-400 hover:underline text-sm"
                        >
                          Delete
                        </button>
                        <Link href={`/title/${c.slug ?? c.id}`} target="_blank" className="text-stream-text-secondary hover:text-white text-sm">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
            {contentTotal > 15 && (
              <div className="mt-4 flex justify-center gap-2 text-sm">
                <button
                  type="button"
                  disabled={contentPage <= 1}
                  onClick={() => setContentPage((p) => p - 1)}
                  className="px-3 py-1 rounded bg-stream-dark-gray disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="py-1 text-stream-text-secondary">
                  Page {contentPage} of {Math.ceil(contentTotal / 15)}
                </span>
                <button
                  type="button"
                  disabled={contentPage >= Math.ceil(contentTotal / 15)}
                  onClick={() => setContentPage((p) => p + 1)}
                  className="px-3 py-1 rounded bg-stream-dark-gray disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'monitoring' && (
          <AdminMonitoring
            analytics={analytics}
            health={health}
            onRefresh={() => {
              loadAnalytics();
              loadHealth();
            }}
          />
        )}
          </section>
        </div>
      </main>

      {contentFormOpen && (
        <AdminContentForm
          contentId={editingContentId}
          onClose={() => { setContentFormOpen(false); setEditingContentId(null); }}
          onSaved={handleContentSaved}
        />
      )}
    </div>
  );
}
