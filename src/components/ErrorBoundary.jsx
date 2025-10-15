import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen w-full bg-[#f4ddc4] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-light mb-4" style={{fontFamily: 'Playfair Display'}}>
              oops
            </h1>
            <p className="text-gray-600 mb-8" style={{fontFamily: 'Playfair Display'}}>
              Niečo sa pokazilo. Skúste obnoviť stránku.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-black text-white px-6 py-3 rounded-full hover:bg-gray-800 transition-colors"
              style={{fontFamily: 'Playfair Display'}}
            >
              Obnoviť
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

