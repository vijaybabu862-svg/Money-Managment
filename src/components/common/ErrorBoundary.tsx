import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Activity } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  showFallbackTable?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Stage 10 Privacy: Never log raw SMS or credentials to error logs
    console.error('ErrorBoundary caught component error:', error.name, error.message);
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private getSanitizedMessage(): string {
    if (!this.state.error) return '';
    let msg = this.state.error.message || 'An unexpected rendering error occurred.';
    // Mask any potential sensitive numbers or keys
    msg = msg.replace(/\b\d{10,16}\b/g, '••••');
    msg = msg.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
    return msg;
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-6 text-center my-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {this.props.fallbackTitle || 'Something went wrong.'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-2">
            {this.props.fallbackMessage ||
              'A temporary display error occurred. Your financial ledger data remains safely intact.'}
          </p>
          <p className="text-xs font-mono text-gray-500 dark:text-gray-500 max-w-sm mx-auto mb-5 truncate">
            {this.getSanitizedMessage()}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Return to Dashboard
            </a>
            <a
              href="/diagnostics"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              Open Diagnostics
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
