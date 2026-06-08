import React, { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { useBetStore } from './store/useBetStore';
import './App.css';

function App() {
  const initStore = useBetStore(state => state.initStore);
  const themeAccent = useBetStore(state => state.themeAccent);

  useEffect(() => {
    initStore();
  }, [initStore]);

  useEffect(() => {
    const colors = {
      emerald: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.15)', hover: '#34d399' },
      blue: { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.15)', hover: '#60a5fa' },
      violet: { primary: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.15)', hover: '#a78bfa' },
      orange: { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.15)', hover: '#fbbf24' },
      red: { primary: '#ef4444', glow: 'rgba(239, 68, 68, 0.15)', hover: '#f87171' }
    };
    const config = colors[themeAccent] || colors.emerald;
    document.documentElement.style.setProperty('--color-accent', config.primary);
    document.documentElement.style.setProperty('--color-accent-glow', config.glow);
    document.documentElement.style.setProperty('--color-accent-hover', config.hover);
  }, [themeAccent]);

  return <AppRoutes />;
}

export default App;
