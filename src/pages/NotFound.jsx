import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{ 
      backgroundColor: 'var(--bg-primary)', 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      textAlign: 'center',
      padding: '16px'
    }}>
      <div style={{ color: 'var(--color-accent)', fontSize: '96px', fontWeight: 900, marginBottom: '16px', textShadow: 'var(--shadow-glow)' }}>404</div>
      <h1 style={{ color: 'var(--color-text-primary)', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Página no encontrada</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px', maxWidth: '380px', fontSize: '15px' }}>
        Esta página no existe o ha sido movida. Vuelve al dashboard para continuar.
      </p>
      <Link
        to="/dashboard"
        className="btn btn-primary"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          textDecoration: 'none'
        }}
      >
        <Home size={18} />
        <span>Ir al Dashboard</span>
      </Link>
    </div>
  );
}
