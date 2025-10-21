import log from './logger';

class ErrorMonitoringService {
  constructor() {
    this.isEnabled = import.meta.env.MODE === 'production';
    this.errorQueue = [];
    this.maxQueueSize = 50;
    this.flushInterval = 30000; // 30 sekund

    // Nastav interval pro odesílání chyb
    if (this.isEnabled) {
      setInterval(() => this.flushErrors(), this.flushInterval);
    }
  }

  captureError(error, context = {}) {
    const errorData = {
      message: error.message || 'Unknown error',
      stack: error.stack || '',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      context: {
        ...context,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          colorDepth: window.screen.colorDepth
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };

    // Log do konzole
    log.error('Error captured:', errorData);

    // Přidej do fronty
    if (this.isEnabled) {
      this.addToQueue(errorData);
    }

    return errorData;
  }

  captureReactError(error, errorInfo) {
    const errorData = {
      message: error.message || 'React Error',
      stack: error.stack || '',
      componentStack: errorInfo.componentStack || '',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      type: 'react-error',
      context: {
        errorBoundary: true
      }
    };

    log.error('React Error captured:', errorData);

    if (this.isEnabled) {
      this.addToQueue(errorData);
    }

    return errorData;
  }

  capturePerformanceIssue(metric, value, threshold) {
    const issueData = {
      message: `Performance issue: ${metric}`,
      metric,
      value,
      threshold,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      type: 'performance',
      context: {
        performance: true
      }
    };

    log.warn('Performance issue captured:', issueData);

    if (this.isEnabled) {
      this.addToQueue(issueData);
    }

    return issueData;
  }

  addToQueue(errorData) {
    this.errorQueue.push(errorData);

    // Omezení velikosti fronty
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Okamžité odeslání pro kritické chyby
    if (errorData.type === 'react-error' || errorData.message.includes('Critical')) {
      this.flushErrors();
    }
  }

  async flushErrors() {
    if (this.errorQueue.length === 0) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    try {
      // Simulace odeslání do externího systému
      // V produkci by se zde použil skutečný error tracking service
      await this.sendToExternalService(errorsToSend);
      log.info(`Sent ${errorsToSend.length} errors to monitoring service`);
    } catch (error) {
      log.error('Failed to send errors to monitoring service:', error);
      // Vrať chyby zpět do fronty
      this.errorQueue.unshift(...errorsToSend);
    }
  }

  async sendToExternalService(errors) {
    // Simulace API volání
    // V produkci by se zde použil skutečný error tracking service (Sentry, LogRocket, atd.)

    const response = await fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        errors,
        appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
        environment: import.meta.env.MODE
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send errors: ${response.status}`);
    }

    return response.json();
  }

  getErrorStats() {
    return {
      queueSize: this.errorQueue.length,
      isEnabled: this.isEnabled,
      lastFlush: this.lastFlushTime
    };
  }

  clearQueue() {
    this.errorQueue = [];
    log.info('Error queue cleared');
  }
}

// Singleton instance
const errorMonitoring = new ErrorMonitoringService();

// Global error handler
window.addEventListener('error', (event) => {
  errorMonitoring.captureError(event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  errorMonitoring.captureError(new Error(event.reason), {
    type: 'unhandled-promise-rejection',
    reason: event.reason
  });
});

export default errorMonitoring;