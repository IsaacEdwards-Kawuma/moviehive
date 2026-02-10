'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-stream-bg flex flex-col items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-stream-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-2 text-white">We hit a snag</h1>
            <p className="text-stream-text-secondary mb-8">
              This page ran into a small issue. Try again or head back to browse — you didn’t miss a thing.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false })}
                className="px-5 py-2.5 rounded-lg bg-stream-accent text-white font-medium hover:bg-red-600 transition-colors"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => typeof window !== 'undefined' && window.location.reload()}
                className="px-5 py-2.5 rounded-lg glass text-white font-medium hover:bg-white/10 transition-colors"
              >
                Refresh page
              </button>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-lg glass text-white font-medium hover:bg-white/10 transition-colors inline-block"
              >
                Go home
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
