'use client';

import { useState, useEffect } from 'react';
import api, { type AdminContentCreate, type AdminContentDetail, type AdminEpisodeCreate } from '@/lib/api';
import { FileUpload } from './FileUpload';

export function AdminContentForm({
  contentId,
  onClose,
  onSaved,
}: {
  contentId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!contentId;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [genres, setGenres] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [genresError, setGenresError] = useState('');
  const [genresEnsuring, setGenresEnsuring] = useState(false);
  const [detail, setDetail] = useState<AdminContentDetail | null>(null);
  const [form, setForm] = useState<AdminContentCreate>({
    type: 'movie',
    title: '',
    description: null,
    releaseYear: null,
    duration: null,
    rating: null,
    thumbnailUrl: null,
    posterUrl: null,
    trailerUrl: null,
    videoUrl: null,
    featured: false,
    genreIds: [],
    languages: ['en'],
    regions: ['US'],
  });
  const [episodeForm, setEpisodeForm] = useState<AdminEpisodeCreate>({
    season: 1,
    episode: 1,
    title: '',
    description: '',
    duration: null,
    videoUrl: '',
    thumbnailUrl: '',
  });
  const [addingEpisode, setAddingEpisode] = useState(false);

  useEffect(() => {
    setGenresLoading(true);
    setGenresError('');
    api.admin
      .getGenres()
      .then(setGenres)
      .catch(() => setGenresError('Could not load genres. Make sure you are logged in as admin and the database seed has been run (npm run db:seed).'))
      .finally(() => setGenresLoading(false));
  }, []);

  useEffect(() => {
    if (!contentId) return;
    api.admin.getContent(contentId).then((data) => {
      setDetail(data);
      setForm({
        type: (data.type as 'movie' | 'series') || 'movie',
        title: data.title,
        description: data.description ?? '',
        releaseYear: data.releaseYear ?? null,
        duration: data.duration ?? null,
        rating: data.rating ?? '',
        thumbnailUrl: data.thumbnailUrl ?? '',
        posterUrl: data.posterUrl ?? '',
        trailerUrl: data.trailerUrl ?? '',
        videoUrl: data.videoUrl ?? '',
        featured: data.featured ?? false,
        genreIds: data.contentGenres?.map((g) => g.genre.id) ?? [],
        languages: (data as { languages?: string[] }).languages ?? ['en'],
        regions: (data as { regions?: string[] }).regions ?? ['US'],
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [contentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit && contentId) {
        await api.admin.updateContent(contentId, form);
      } else {
        await api.admin.createContent(form);
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentId) return;
    setAddingEpisode(true);
    setError('');
    try {
      await api.admin.addEpisode(contentId, episodeForm);
      const updated = await api.admin.getContent(contentId);
      setDetail(updated);
      setEpisodeForm({ season: episodeForm.season, episode: episodeForm.episode + 1, title: '', description: '', duration: null, videoUrl: '', thumbnailUrl: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add episode');
    } finally {
      setAddingEpisode(false);
    }
  };

  const handleDeleteEpisode = async (episodeId: string) => {
    if (!confirm('Delete this episode?')) return;
    try {
      await api.admin.deleteEpisode(episodeId);
      if (contentId) {
        const updated = await api.admin.getContent(contentId);
        setDetail(updated);
      }
    } catch {
      setError('Failed to delete episode');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
        <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 flex items-start justify-center p-4">
      <div className="bg-stream-dark-gray rounded-lg max-w-2xl w-full my-8 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-stream-gray">
          <h2 className="text-xl font-bold">{isEdit ? 'Edit content' : 'Add content'}</h2>
          <button type="button" onClick={onClose} className="text-stream-text-secondary hover:text-white text-2xl">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <p className="text-stream-accent text-sm">{error}</p>}
          <div>
            <label className="block text-sm text-stream-text-secondary mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'movie' | 'series' }))}
              className="w-full bg-stream-black border border-stream-gray rounded px-3 py-2 text-white"
            >
              <option value="movie">Movie</option>
              <option value="series">Series</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-stream-text-secondary mb-1">Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full bg-stream-black border border-stream-gray rounded px-3 py-2 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-stream-text-secondary mb-1">Description</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
              className="w-full bg-stream-black border border-stream-gray rounded px-3 py-2 text-white"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-stream-text-secondary mb-1">Release year</label>
              <input
                type="number"
                value={form.releaseYear ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, releaseYear: e.target.value ? parseInt(e.target.value, 10) : null }))}
                className="w-full bg-stream-black border border-stream-gray rounded px-3 py-2 text-white"
                min={1900}
                max={2100}
              />
            </div>
            <div>
              <label className="block text-sm text-stream-text-secondary mb-1">Duration (min)</label>
              <input
                type="number"
                value={form.duration ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value ? parseInt(e.target.value, 10) : null }))}
                className="w-full bg-stream-black border border-stream-gray rounded px-3 py-2 text-white"
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-stream-text-secondary mb-1">Rating (e.g. PG-13, R)</label>
            <input
              value={form.rating ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value || null }))}
              className="w-full bg-stream-black border border-stream-gray rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stream-text-secondary mb-2">Genres</label>
            <p className="text-xs text-stream-text-secondary mb-2">Select all that apply (tick the genres this movie or series belongs to)</p>
            {genresLoading ? (
              <p className="text-stream-text-secondary text-sm">Loading genres…</p>
            ) : genresError ? (
              <p className="text-stream-accent text-sm">{genresError}</p>
            ) : genres.length === 0 ? (
              <div className="space-y-2">
                <p className="text-amber-500 text-sm">No genres yet. Load the default list so you can tick genres when adding content.</p>
                <button
                  type="button"
                  disabled={genresEnsuring}
                  onClick={async () => {
                    setGenresEnsuring(true);
                    setGenresError('');
                    try {
                      const list = await api.admin.ensureDefaultGenres();
                      setGenres(list);
                    } catch (e) {
                      setGenresError(e instanceof Error ? e.message : 'Failed to load default genres');
                    } finally {
                      setGenresEnsuring(false);
                    }
                  }}
                  className="bg-stream-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {genresEnsuring ? 'Loading…' : 'Load default genres'}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => {
                  const isChecked = form.genreIds?.includes(g.id) ?? false;
                  return (
                    <label
                      key={g.id}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-stream-accent/20 border-stream-accent text-white'
                          : 'bg-stream-black border-stream-gray text-stream-text-secondary hover:border-stream-text-secondary'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            genreIds: e.target.checked ? [...(f.genreIds ?? []), g.id] : (f.genreIds ?? []).filter((id) => id !== g.id),
                          }))
                        }
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{g.name}</span>
                      {isChecked && <span className="text-stream-accent" aria-hidden>✓</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <FileUpload
            type="image"
            label="Thumbnail"
            currentUrl={form.thumbnailUrl ?? null}
            onUploaded={(url) => setForm((f) => ({ ...f, thumbnailUrl: url || null }))}
          />
          <FileUpload
            type="image"
            label="Poster"
            currentUrl={form.posterUrl ?? null}
            onUploaded={(url) => setForm((f) => ({ ...f, posterUrl: url || null }))}
          />
          <FileUpload
            type="video"
            label="Video (movie or first episode)"
            currentUrl={form.videoUrl ?? null}
            onUploaded={(url) => setForm((f) => ({ ...f, videoUrl: url || null }))}
          />
          <p className="text-xs text-stream-text-secondary -mt-2">
            <strong>Both options work:</strong> (1) <strong>Upload</strong> — stores on the server; works locally, but on production (Render) files are temporary. (2) <strong>Paste URL</strong> — use a direct MP4/WebM link (e.g. Bunny, Cloudinary); works on web and is streamed through the app. You can mix: some titles with uploaded video (local), some with pasted URL (web). Do not use YouTube or image links here—only for Trailer or Poster.
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured ?? false}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">Featured on homepage</span>
          </label>
          <div className="flex gap-2 pt-4">
            <button type="submit" disabled={saving} className="bg-stream-accent text-white px-4 py-2 rounded font-medium hover:bg-red-600 disabled:opacity-50">
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={onClose} className="bg-stream-gray text-white px-4 py-2 rounded font-medium">
              Cancel
            </button>
          </div>
        </form>

        {isEdit && detail?.type === 'series' && (
          <div className="p-4 border-t border-stream-gray">
            <h3 className="font-bold mb-3">Episodes</h3>
            {detail.episodes?.length ? (
              <ul className="space-y-2 mb-4">
                {detail.episodes.map((ep) => (
                  <li key={ep.id} className="flex items-center justify-between bg-stream-black rounded px-3 py-2 text-sm">
                    <span>S{ep.season} E{ep.episode} {ep.title ?? ''}</span>
                    <button type="button" onClick={() => handleDeleteEpisode(ep.id)} className="text-red-400 hover:underline">
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <form onSubmit={handleAddEpisode} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="Season"
                  value={episodeForm.season}
                  onChange={(e) => setEpisodeForm((f) => ({ ...f, season: parseInt(e.target.value, 10) || 1 }))}
                  className="bg-stream-black border border-stream-gray rounded px-3 py-2 text-white text-sm"
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Episode"
                  value={episodeForm.episode}
                  onChange={(e) => setEpisodeForm((f) => ({ ...f, episode: parseInt(e.target.value, 10) || 1 }))}
                  className="bg-stream-black border border-stream-gray rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <input
                placeholder="Title"
                value={episodeForm.title ?? ''}
                onChange={(e) => setEpisodeForm((f) => ({ ...f, title: e.target.value || null }))}
                className="w-full bg-stream-black border border-stream-gray rounded px-3 py-2 text-white text-sm"
              />
              <FileUpload
                type="video"
                label="Episode video (upload or paste URL)"
                currentUrl={episodeForm.videoUrl ?? null}
                onUploaded={(url) => setEpisodeForm((f) => ({ ...f, videoUrl: url || null }))}
              />
              <FileUpload
                type="image"
                label="Episode thumbnail"
                currentUrl={episodeForm.thumbnailUrl ?? null}
                onUploaded={(url) => setEpisodeForm((f) => ({ ...f, thumbnailUrl: url || null }))}
              />
              <button type="submit" disabled={addingEpisode} className="bg-stream-accent/80 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50">
                {addingEpisode ? 'Adding...' : 'Add episode'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
