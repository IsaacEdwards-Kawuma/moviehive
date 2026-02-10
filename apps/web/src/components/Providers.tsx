'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { setApiAccessTokenGetter, setApiTokenUpdater } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { ToastProvider } from '@/context/ToastContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );
  useEffect(() => {
    setApiAccessTokenGetter(() => useAuthStore.getState().accessToken);
    setApiTokenUpdater((token) => useAuthStore.getState().setToken(token));
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
