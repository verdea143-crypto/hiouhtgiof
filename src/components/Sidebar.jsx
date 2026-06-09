import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  Calculator, 
  Wallet, 
  UserSquare2, 
  Settings as SettingsIcon, 
  LogOut, 
  Cloud, 
  CloudOff,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { useBetStore } from '../store/useBetStore';
import { authService } from '../services/authService';
import { useTheme } from '../hooks/useTheme';

export const Sidebar = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const user = useBetStore(state => state.user);
  const setUser = useBetStore(state => state.setUser);
  const isCloud = useBetStore(state => state.isCloudActive());
  const isModalOpen = useBetStore(state => state.isModalOpen);
  const [showMore, setShowMore] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setUser(null);
      navigate('/auth');
    } catch (e) {
      console.error('Error logging out:', e);
    }
  };

  const navItems = [
    { to: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
    { to: '/bets', label: 'Apuestas', icon: Receipt },
    { to: '/calculators', label: 'Calculadoras', icon: Calculator },
  ];

  const extraItems = [
    { to: '/bankrolls', label: 'Bancas', icon: Wallet },
    { to: '/tipsters', label: 'Tipsters', icon: UserSquare2 },
    { to: '/settings', label: 'Ajustes', icon: SettingsIcon },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className={`desktop-sidebar glass-panel ${isModalOpen ? 'sidebar-hidden' : ''}`} style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        bottom: '16px',
        width: '228px',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        zIndex: 100,
        transform: isModalOpen ? 'translateX(-260px)' : 'translateX(0)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', paddingLeft: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#030712',
            fontWeight: 800,
            fontSize: '18px',
            boxShadow: '0 0 10px rgba(16,185,129,0.3)'
          }}>B</div>
          <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px', color: '#f3f4f6' }}>
            Bet<span style={{ color: '#10b981' }}>Flow</span>
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {[...navItems, ...extraItems].map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  color: '#9ca3af',
                  textDecoration: 'none',
                  fontSize: '15px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Connection Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: isCloud ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
            border: `1px solid ${isCloud ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`,
            color: isCloud ? '#10b981' : '#f59e0b'
          }}>
            {isCloud ? <Cloud size={14} /> : <CloudOff size={14} />}
            <span>{isCloud ? 'Sincronizado' : 'Modo Local'}</span>
          </div>

          {/* User profile */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '110px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email ? user.email.split('@')[0] : 'Invitado'}
              </span>
              <span style={{ fontSize: '11px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || 'Modo Local'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={toggleTheme}
                title="Cambiar tema"
                aria-label="Cambiar tema"
                style={{ color: '#9ca3af', cursor: 'pointer', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px' }}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button 
                onClick={handleLogout}
                className="btn-icon" 
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                style={{ color: '#ef4444', cursor: 'pointer', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className={`mobile-bottom-nav glass-panel ${isModalOpen ? 'sidebar-hidden' : ''}`} style={{
        position: 'fixed',
        left: '16px',
        right: '16px',
        bottom: '16px',
        height: '64px',
        borderRadius: '16px',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        zIndex: 500,
        transform: isModalOpen ? 'translateY(100px)' : 'translateY(0)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                color: '#9ca3af',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 600,
                width: '64px',
                height: '100%',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setShowMore(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            color: showMore ? '#10b981' : '#9ca3af',
            background: 'transparent',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            width: '64px',
            height: '100%',
            cursor: 'pointer'
          }}
        >
          <Menu size={20} />
          <span>Más</span>
        </button>
      </nav>

      {/* MOBILE BOTTOM SHEET FOR "MORE" MENU */}
      {showMore && (
        <div 
          className="bottom-sheet-overlay"
          onClick={() => setShowMore(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
        >
          <div 
            className="bottom-sheet glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '500px',
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Header */}
            <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#f3f4f6' }}>Menú Principal</span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>{user?.email || 'Modo Local'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={toggleTheme}
                  title="Cambiar tema"
                  aria-label="Cambiar tema"
                  style={{ color: '#9ca3af', cursor: 'pointer', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px' }}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button 
                  onClick={() => setShowMore(false)}
                  className="btn-icon"
                  style={{ color: '#9ca3af', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Extra Menu Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {extraItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setShowMore(false)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '16px 8px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      color: '#9ca3af',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Icon size={20} style={{ color: '#10b981' }} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* Sync Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: isCloud ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${isCloud ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`,
              color: isCloud ? '#10b981' : '#f59e0b'
            }}>
              {isCloud ? <Cloud size={14} /> : <CloudOff size={14} />}
              <span>{isCloud ? 'Datos Sincronizados con la Nube' : 'Datos en Almacenamiento Local'}</span>
            </div>

            {/* Logout button */}
            <button 
              onClick={() => { setShowMore(false); handleLogout(); }}
              className="btn btn-secondary"
              style={{
                width: '100%',
                gap: '10px',
                borderColor: '#ef4444',
                color: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                padding: '12px'
              }}
            >
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Global CSS Styles for NavLink active states & sidebar animations */}
      <style dangerouslySetInnerHTML={{__html: `
        .sidebar-link:hover {
          color: #f3f4f6 !important;
          background: rgba(255, 255, 255, 0.03);
        }
        .sidebar-link.active {
          color: #030712 !important;
          background: var(--color-accent) !important;
          box-shadow: var(--shadow-glow);
        }
        .mobile-nav-link.active {
          color: var(--color-accent) !important;
        }
        
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @media (max-width: 1024px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-bottom-nav {
            display: flex !important;
          }
        }
      `}} />
    </>
  );
};

export default Sidebar;
