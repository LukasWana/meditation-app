import React from 'react';
import errorMonitoring from '@services/errorMonitoring';
import { useTheme, getCardClasses } from '@hooks/useTheme';

// Wrapper komponenta pro přístup k theme v class komponentě
const ErrorBoundaryContent = ({ error, errorInfo, onRetry }) => {
  const theme = useTheme();
  const cardClasses = getCardClasses('default');

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: theme.colors.background }}
    >
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1
            className="mb-4"
            style={{
              fontSize: theme.typography.fontSize['6xl'],
              fontWeight: theme.typography.fontWeight.light
            }}
          >
            Oops!
          </h1>
          <p
            className="mb-6"
            style={{
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.gray[700]
            }}
          >
            Něco se pokazilo. Aplikace se pokusí obnovit.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className={`w-full ${cardClasses} px-6 py-3 transition-colors`}
            style={{ color: theme.colors.gray[700] }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.overlay.white70;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.overlay.white50;
            }}
          >
            Obnovit stránku
          </button>

          <button
            onClick={onRetry}
            className="w-full rounded-lg px-6 py-3 transition-colors text-white"
            style={{
              backgroundColor: theme.colors.gray[800],
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.gray[700];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.gray[800];
            }}
          >
            Zkusit znovu
          </button>
        </div>

        {import.meta.env.MODE === 'development' && (
          <details className="mt-8 text-left">
            <summary
              className="cursor-pointer hover:opacity-80"
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.gray[600]
              }}
            >
              Technické detaily (pouze pro vývojáře)
            </summary>
            <div
              className="mt-4 p-4 rounded-lg overflow-auto max-h-64"
              style={{
                backgroundColor: theme.colors.overlay.white30,
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.gray[600]
              }}
            >
              <pre className="whitespace-pre-wrap">
                {error && error.toString()}
                {errorInfo && errorInfo.componentStack}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

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
        <ErrorBoundaryContent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={() => this.setState({ hasError: false, error: null, errorInfo: null })}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;