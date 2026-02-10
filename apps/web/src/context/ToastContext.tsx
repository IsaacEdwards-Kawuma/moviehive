'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [nextId, setNextId] = useState(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId;
    setNextId((n) => n + 1);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, [nextId]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none sm:left-auto sm:right-6 sm:max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg px-4 py-3 shadow-lg text-sm font-medium ${
              t.type === 'error'
                ? 'bg-red-600/95 text-white'
                : t.type === 'info'
                  ? 'bg-stream-dark-gray text-white border border-stream-gray'
                  : 'bg-stream-accent/95 text-white'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { showToast: () => {} };
  return ctx;
}
