import React from 'react';
import { motion } from 'framer-motion';
import { Heading } from '@components/ui/Heading';

function ErrorBoundaryContent({ hasError, error, errorInfo, onRetry }) {
  if (!hasError) return null;

  // Use default colors instead of theme context to avoid hook errors
  const backgroundColor = '#f4ddc4';
  const textColor = 'rgba(0, 0, 0, 1)';
  const textSecondaryColor = 'rgba(100, 100, 100, 1)';
  const primaryColor = 'rgba(0, 0, 0, 0.8)';

  return (
    <motion.div
      className="min-h-screen w-full flex flex-col items-center justify-center p-8"
      style={{
        backgroundColor: backgroundColor,
        color: textColor
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-md w-full text-center">
        <motion.div
          className="text-6xl mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          ⚠️
        </motion.div>

        <Heading level={1} visual={2} className="font-bold" style={{ color: textColor }}>
          Oops! Něco se pokazilo
        </Heading>

        <p className="mb-6" style={{ color: textSecondaryColor }}>
          Aplikace narazila na neočekávanou chybu. Zkus to prosím znovu.
        </p>

        <div className="space-y-3">
          <motion.button
            onClick={onRetry}
            className="w-full text-white px-6 py-3 rounded-lg transition-colors"
            style={{
              backgroundColor: primaryColor
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Zkusit znovu
          </motion.button>
        </div>

        {error && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm" style={{ color: textSecondaryColor }}>
              Zobrazit detaily chyby
            </summary>
            <div className="mt-3 p-4 bg-white bg-opacity-50 rounded-lg text-xs overflow-auto max-h-40">
              <p style={{ color: textColor, fontWeight: 'bold' }}>{error.toString()}</p>
              {errorInfo?.componentStack && (
                <pre className="mt-2" style={{ color: textSecondaryColor }}>
                  {errorInfo.componentStack}
                </pre>
              )}
            </div>
          </details>
        )}
      </div>
    </motion.div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundaryContent
          hasError={this.state.hasError}
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
