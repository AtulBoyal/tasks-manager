import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Crash:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-900 text-white p-8">
          <h1 className="text-4xl font-bold text-red-500">
            Something went wrong
          </h1>

          <p className="text-slate-300 text-center max-w-lg">
            The application encountered an unexpected error.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 transition"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;