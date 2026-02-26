import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import JournalView from '../views/JournalView';
import LoginPage from '../views/LoginPage';
import ProtectedRoute from './ProtectedRoute';

// Lazy-load heavy views — these are only downloaded when the user first visits the route
const GraphView = lazy(() => import('../views/GraphView'));
const MapView = lazy(() => import('../views/MapView'));
const EntitiesView = lazy(() => import('../views/EntitiesView'));
const InventoryView = lazy(() => import('../views/InventoryView'));
const RoutinesView = lazy(() => import('../views/RoutinesView'));
const SettingsView = lazy(() => import('../views/SettingsView'));

function ViewFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/journal" replace /> },
      { path: 'journal', element: <JournalView /> },
      {
        path: 'graph',
        element: (
          <Suspense fallback={<ViewFallback />}>
            <GraphView />
          </Suspense>
        ),
      },
      {
        path: 'map',
        element: (
          <Suspense fallback={<ViewFallback />}>
            <MapView />
          </Suspense>
        ),
      },
      {
        path: 'entities',
        element: (
          <Suspense fallback={<ViewFallback />}>
            <EntitiesView />
          </Suspense>
        ),
      },
      {
        path: 'inventory',
        element: (
          <Suspense fallback={<ViewFallback />}>
            <InventoryView />
          </Suspense>
        ),
      },
      {
        path: 'routines',
        element: (
          <Suspense fallback={<ViewFallback />}>
            <RoutinesView />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<ViewFallback />}>
            <SettingsView />
          </Suspense>
        ),
      },
    ],
  },
]);
