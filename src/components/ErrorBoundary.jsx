import React, { Component } from 'react';
import { RefreshCw } from 'lucide-react';

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          backgroundColor: 'var(--bg-primary)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '16px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: 'var(--color-text-primary)', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Algo salió mal</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', maxWidth: '380px', fontSize: '14px' }}>
            {this.state.error?.message || 'Error inesperado'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <RefreshCw size={16} />
            <span>Recargar página</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
