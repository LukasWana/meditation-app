/**
 * Security Monitor - sledování bezpečnostních událostí
 * Implementuje monitoring pro detekci podezřelé aktivity
 */

class SecurityMonitor {
  constructor() {
    this.events = [];
    this.maxEvents = 100; // Limit pro paměť
    this.suspiciousThreshold = 5; // Počet podezřelých událostí za minutu
    this.lastMinuteEvents = [];
  }

  /**
   * Loguje bezpečnostní událost
   * @param {string} event - Typ události
   * @param {string} severity - Závažnost (info, warning, error, critical)
   * @param {Object} metadata - Dodatečné informace
   */
  logEvent(event, severity = 'info', metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer
      }
    };

    // Přidat do historie
    this.events.push(logEntry);
    this.lastMinuteEvents.push(logEntry);

    // Omezit velikost historie
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Vyčistit staré události (starší než 1 minuta)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    this.lastMinuteEvents = this.lastMinuteEvents.filter(
      event => new Date(event.timestamp) > oneMinuteAgo
    );

    // Log do konzole v development módu
    if (import.meta.env.MODE === 'development') {
      const emoji = this.getSeverityEmoji(severity);
      console.log(`${emoji} Security Event:`, logEntry);
    }

    // Kontrola podezřelé aktivity
    this.checkSuspiciousActivity();

    // Odeslat do monitoring service v produkci
    if (import.meta.env.MODE === 'production') {
      this.sendToMonitoringService(logEntry);
    }
  }

  /**
   * Získá emoji pro závažnost
   */
  getSeverityEmoji(severity) {
    const emojis = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    };
    return emojis[severity] || '📝';
  }

  /**
   * Kontroluje podezřelou aktivitu
   */
  checkSuspiciousActivity() {
    const recentEvents = this.lastMinuteEvents;
    const suspiciousEvents = recentEvents.filter(
      event => event.severity === 'warning' || event.severity === 'error' || event.severity === 'critical'
    );

    if (suspiciousEvents.length >= this.suspiciousThreshold) {
      this.logEvent('suspicious_activity_detected', 'critical', {
        suspiciousEventCount: suspiciousEvents.length,
        timeWindow: '1 minute',
        events: suspiciousEvents.map(e => e.event)
      });
    }
  }

  /**
   * Odesílá událost do monitoring service
   */
  async sendToMonitoringService(logEntry) {
    try {
      // V produkci by se zde odeslalo do skutečného monitoring service
      // Například: Sentry, LogRocket, nebo vlastní API
      
      // Pro demo účely pouze logujeme
      console.log('📡 Sending to monitoring service:', logEntry.event);
      
      // Simulace odeslání
      // await fetch('/api/security-log', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logEntry)
      // });
    } catch (error) {
      console.error('❌ Failed to send security event to monitoring service:', error);
    }
  }

  /**
   * Loguje pokus o neoprávněný přístup
   */
  logUnauthorizedAccess(resource, reason) {
    this.logEvent('unauthorized_access_attempt', 'warning', {
      resource,
      reason,
      ip: 'client-side' // V reálné aplikaci by se získalo ze serveru
    });
  }

  /**
   * Loguje podezřelé Firebase operace
   */
  logSuspiciousFirebaseOperation(operation, details) {
    this.logEvent('suspicious_firebase_operation', 'warning', {
      operation,
      details,
      timestamp: Date.now()
    });
  }

  /**
   * Loguje chyby autentifikace
   */
  logAuthError(error, context) {
    this.logEvent('authentication_error', 'error', {
      error: error.message,
      context,
      stack: error.stack
    });
  }

  /**
   * Loguje úspěšné bezpečnostní operace
   */
  logSecuritySuccess(operation, details) {
    this.logEvent('security_success', 'info', {
      operation,
      details
    });
  }

  /**
   * Získá statistiky bezpečnostních událostí
   */
  getSecurityStats() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentEvents = this.events.filter(
      event => new Date(event.timestamp) > last24Hours
    );

    const stats = {
      total: recentEvents.length,
      bySeverity: {
        info: recentEvents.filter(e => e.severity === 'info').length,
        warning: recentEvents.filter(e => e.severity === 'warning').length,
        error: recentEvents.filter(e => e.severity === 'error').length,
        critical: recentEvents.filter(e => e.severity === 'critical').length
      },
      byEvent: {}
    };

    // Počítat události podle typu
    recentEvents.forEach(event => {
      stats.byEvent[event.event] = (stats.byEvent[event.event] || 0) + 1;
    });

    return stats;
  }

  /**
   * Exportuje bezpečnostní logy pro analýzu
   */
  exportLogs() {
    return {
      timestamp: new Date().toISOString(),
      totalEvents: this.events.length,
      events: this.events,
      stats: this.getSecurityStats()
    };
  }
}

// Vytvoření singleton instance
const securityMonitor = new SecurityMonitor();

// Export pro použití v aplikaci
export default securityMonitor;

// Export pro debugging v development módu
if (import.meta.env.MODE === 'development') {
  window.securityMonitor = securityMonitor;
  console.log('🔒 Security Monitor initialized. Use window.securityMonitor for debugging.');
}
