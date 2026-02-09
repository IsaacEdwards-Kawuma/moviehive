'use client';

/** Logo icon for MOVI HIVE - film strip / play style. */
export function LogoIcon({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="40" height="40" rx="8" fill="currentColor" className="text-stream-accent" />
      <path
        d="M16 12v16l12-8-12-8z"
        fill="currentColor"
        className="text-stream-bg"
      />
      <rect x="8" y="10" width="3" height="3" rx="0.5" fill="currentColor" className="text-stream-bg opacity-60" />
      <rect x="8" y="27" width="3" height="3" rx="0.5" fill="currentColor" className="text-stream-bg opacity-60" />
      <rect x="29" y="10" width="3" height="3" rx="0.5" fill="currentColor" className="text-stream-bg opacity-60" />
      <rect x="29" y="27" width="3" height="3" rx="0.5" fill="currentColor" className="text-stream-bg opacity-60" />
    </svg>
  );
}
