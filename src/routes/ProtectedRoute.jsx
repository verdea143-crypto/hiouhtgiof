import React from 'react';
import { Navigate } from 'react-router-dom';
import { useBetStore } from '../store/useBetStore';

export const ProtectedRoute = ({ children }) => {
  const user = useBetStore(state => state.user);
  const isInitialized = useBetStore(state => state.isInitialized);

  if (!isInitialized) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        width: '100vw',
        backgroundColor: '#080b11',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(16, 185, 129, 0.1)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
        <span style={{ color: '#9ca3af', fontSize: '16px', fontWeight: 500, letterSpacing: '1px' }}>
          Cargando BetFlow...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

export default ProtectedRoute;
