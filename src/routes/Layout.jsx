import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useBetStore } from '../store/useBetStore';
import Sidebar from '../components/Sidebar';

export const Layout = () => {
  const isModalOpen = useBetStore(state => state.isModalOpen);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', width: '100%' }}>
      <div className="app-container" style={{ display: 'flex', flex: 1, width: '100%' }}>
        <Sidebar />
        
        <main className="main-content" style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          height: '100vh',
          backgroundColor: '#080b11',
          marginLeft: isModalOpen ? '0px' : '260px',
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <React.Suspense fallback={
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '80vh', 
              flexDirection: 'column', 
              gap: '16px' 
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(255, 255, 255, 0.05)',
                borderTopColor: '#10b981',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>
                Cargando módulo...
              </span>
            </div>
          }>
            <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
              <Outlet />
            </div>
          </React.Suspense>
        </main>
      </div>
      
      {/* Sonner Toaster config */}
      <Toaster 
        closeButton 
        theme="dark" 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#161d2f',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#f3f4f6',
            borderRadius: '12px'
          }
        }}
      />
      
      {/* Responsiveness styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 1024px) {
          .main-content {
            margin-left: 0 !important;
            padding-bottom: 96px !important;
            height: auto !important;
            min-height: calc(100vh - 96px);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default Layout;
