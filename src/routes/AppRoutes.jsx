import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Layout from './Layout';

// Explicit Lazy Loading per View
const Dashboard = React.lazy(() => import('../views/Dashboard'));
const Bets = React.lazy(() => import('../views/Bets'));
const Bankrolls = React.lazy(() => import('../views/Bankrolls'));
const Tipsters = React.lazy(() => import('../views/Tipsters'));
const Calculators = React.lazy(() => import('../views/Calculators'));
const Settings = React.lazy(() => import('../views/Settings'));
const Auth = React.lazy(() => import('../views/Auth'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

const router = createBrowserRouter([
  {
    path: '/auth',
    element: (
      <React.Suspense fallback={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh', 
          width: '100vw',
          backgroundColor: '#080b11' 
        }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '3px solid rgba(255, 255, 255, 0.05)', 
            borderTopColor: '#10b981', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite' 
          }} />
        </div>
      }>
        <Auth />
      </React.Suspense>
    )
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      {
        path: 'bets',
        element: <Bets />
      },
      {
        path: 'bankrolls',
        element: <Bankrolls />
      },
      {
        path: 'tipsters',
        element: <Tipsters />
      },
      {
        path: 'calculators',
        element: <Calculators />
      },
      {
        path: 'settings',
        element: <Settings />
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  }
]);

export const AppRoutes = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;
