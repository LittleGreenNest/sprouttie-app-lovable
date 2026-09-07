import React from 'react';
import { RefreshCw } from 'lucide-react';
import { isStaleBuildError, recoverFromStaleBuild } from '../../utils/lazyWithRetry';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    // React.lazy caches the rejected promise, so clearing state alone re-throws
    // the same error forever. A failed chunk also needs the stale service worker
    // and its caches gone before reloading, or we just get the old shell back.
    if (isStaleBuildError(this.state.error)) {
      recoverFromStaleBuild();
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
          <div className="p-3 rounded-full bg-destructive/10 mb-4">
            <span className="text-3xl">😕</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            This page couldn't load properly. Try refreshing. If it keeps happening, let us know.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
