'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component pour catch les erreurs React.
 * Affiche un fallback UI au lieu de crasher toute l'app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Une erreur est survenue</h2>
            <p className="text-gray-600 mb-4">{this.state.error.message}</p>
            <button
              onClick={this.reset}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Composant d'erreur standardisé pour les sections de données.
 */
export function DataError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-700 font-medium mb-2">Erreur de chargement</p>
      <p className="text-red-600 text-sm mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

/**
 * Composant de chargement standardisé.
 */
export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      {message && <p className="mt-4 text-gray-600">{message}</p>}
    </div>
  );
}
