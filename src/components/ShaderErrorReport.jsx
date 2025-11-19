/**
 * Shader Error Report Component
 * Komponenta pro hlášení shader chyb
 */

import React, { useState } from 'react';
import { getErrorStats, exportErrorStats } from '@utils/shaderErrorAnalytics';

const ShaderErrorReport = ({ shaderPath, errorMessage, errorInfo, onClose }) => {
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Shromáždě informace o chybě
      const reportData = {
        shaderPath,
        errorMessage,
        errorInfo,
        userEmail: email,
        userDescription: description,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        webglVersion: errorInfo?.webglVersion || 'unknown',
        errorStats: getErrorStats(),
        exportedStats: exportErrorStats()
      };

      // V produkci by se zde odeslal report na backend
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Error Report:', reportData);
        // Simulace odeslání
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // TODO: Odeslat na backend API
        // await fetch('/api/shader-error-report', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(reportData)
        // });
      }

      setSubmitted(true);
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit error report:', error);
      alert('Nepodařilo se odeslat hlášení. Zkuste to prosím znovu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div style={{ color: '#4caf50', fontSize: '18px', marginBottom: '10px' }}>
          ✓ Hlášení odesláno
        </div>
        <div style={{ color: '#666', fontSize: '14px' }}>
          Děkujeme za vaši zpětnou vazbu!
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Nahlásit chybu shaderu</h3>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Email (volitelné):
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            placeholder="vas@email.com"
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
            Popis problému (volitelné):
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              minHeight: '100px',
              resize: 'vertical'
            }}
            placeholder="Popište, co se stalo..."
          />
        </div>

        <div style={{ marginBottom: '15px', fontSize: '12px', color: '#666' }}>
          <strong>Shader:</strong> {shaderPath || 'Neznámý'}<br />
          <strong>Chyba:</strong> {errorMessage}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            Zrušit
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#2196f3',
              color: '#fff',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1
            }}
          >
            {isSubmitting ? 'Odesílám...' : 'Odeslat'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ShaderErrorReport;





