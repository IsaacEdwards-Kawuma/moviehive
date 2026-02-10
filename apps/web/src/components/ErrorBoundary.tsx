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
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-stream-bg flex flex-col items-center justify-center px-6">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-stream-text-secondary mb-6">
              An unexpected error occurred. Try refreshing the page or going back home.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 rounded-lg bg-stream-accent text-white font-medium hover:bg-red-600"
              >
                Try again
              </button>
              <Link
                href="/"
                className="px-4 py-2 rounded-lg glass text-white font-medium hover:bg-white/10"
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
