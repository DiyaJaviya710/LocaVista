import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-12 max-w-xl rounded-3xl border border-rose-500/30 bg-slate-900/90 p-6 text-slate-100 shadow-2xl backdrop-blur-xl">
          <h2 className="text-xl font-bold text-rose-400">Something went wrong</h2>
          <p className="mt-2 text-sm text-slate-300">An unexpected error occurred while rendering this page.</p>
          <div className="mt-4 rounded-xl bg-slate-950 p-3 text-xs font-mono text-rose-300">
            {this.state.error?.toString()}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
