'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';

interface FileUploadProps {
  type: 'video' | 'image';
  label: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}

export function FileUpload({ type, label, currentUrl, onUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = type === 'video'
    ? 'video/mp4,video/webm,video/quicktime,.mp4,.mkv,.webm,.mov,.avi'
    : 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif';

  const handleFile = async (file: File) => {
    setError('');
    setProgress(0);
    setUploading(true);
    try {
      const uploader = type === 'video' ? api.upload.video : api.upload.image;
      const result = await uploader(file, (pct) => setProgress(pct));
      onUploaded(result.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <label className="block text-sm text-stream-text-secondary mb-1">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded p-3 text-center transition cursor-pointer ${dragOver ? 'border-stream-accent bg-stream-accent/10' : 'border-stream-gray hover:border-stream-text-secondary'}`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={onFileChange}
          className="hidden"
        />

        {uploading ? (
          <div className="py-2">
            <div className="w-full bg-stream-black rounded-full h-2 mb-2">
              <div
                className="bg-stream-accent h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-stream-text-secondary">Uploading... {progress}%</p>
          </div>
        ) : currentUrl ? (
          <div className="flex items-center gap-3">
            {type === 'image' && (
              <img src={currentUrl} alt="" className="w-16 h-10 object-cover rounded" />
            )}
            {type === 'video' && (
              <span className="w-10 h-10 rounded bg-stream-black flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-stream-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs text-stream-text-secondary truncate">{currentUrl}</p>
              <p className="text-xs text-stream-accent">Click or drag to replace</p>
            </div>
          </div>
        ) : (
          <div className="py-3">
            <svg className="w-8 h-8 mx-auto text-stream-text-secondary mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-stream-text-secondary">
              Click to browse or drag &amp; drop
            </p>
            <p className="text-xs text-stream-text-secondary mt-1">
              {type === 'video' ? 'MP4, WebM, MKV, MOV (up to 5 GB)' : 'JPG, PNG, WebP, GIF (up to 20 MB)'}
            </p>
          </div>
        )}
      </div>
      {error && <p className="text-stream-accent text-xs mt-1">{error}</p>}

      {/* Also allow manual URL entry */}
      <input
        type="text"
        value={currentUrl ?? ''}
        onChange={(e) => onUploaded(e.target.value)}
        placeholder={type === 'video' ? 'Or paste video URL...' : 'Or paste image URL...'}
        className="w-full bg-stream-black border border-stream-gray rounded px-3 py-1.5 text-white text-xs mt-2 placeholder-stream-text-secondary focus:outline-none focus:ring-1 focus:ring-stream-accent"
      />
    </div>
  );
}
