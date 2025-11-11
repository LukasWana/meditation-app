import React from 'react';
import errorMonitoring from '@services/errorMonitoring';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    // Aktualizuj state tak, aby příští render zobrazil fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Zaznamená chybu do error monitoring systému
    errorMonitoring.captureReactError(error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen bg-[#f4ddc4] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mb-8">
              <h1 className="text-6xl font-light mb-4">
                Oops!
              </h1>
              <p className="text-xl text-gray-700 mb-6">
                Něco se pokazilo. Aplikace se pokusí obnovit.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-white/50 backdrop-blur rounded-lg border border-black/10 px-6 py-3 text-gray-700 hover:bg-white/70 transition-colors"
              >
                Obnovit stránku
              </button>

              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="w-full bg-gray-800 text-white rounded-lg px-6 py-3 hover:bg-gray-700 transition-colors"
              >
                Zkusit znovu
              </button>
            </div>

            {import.meta.env.MODE === 'development' && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  Technické detaily (pouze pro vývojáře)
                </summary>
                <div className="mt-4 p-4 bg-white/30 rounded-lg text-xs text-gray-600 overflow-auto max-h-64">
                  <pre className="whitespace-pre-wrap">
                    {this.state.error && this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;