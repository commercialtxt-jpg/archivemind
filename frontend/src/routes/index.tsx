import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import JournalView from '../views/JournalView';
import GraphView from '../views/GraphView';
import MapView from '../views/MapView';
import EntitiesView from '../views/EntitiesView';
import InventoryView from '../views/InventoryView';
import RoutinesView from '../views/RoutinesView';
import SettingsView from '../views/SettingsView';
import LoginPage from '../views/LoginPage';
import ProtectedRoute from './ProtectedRoute';

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
      { path: 'graph', element: <GraphView /> },
      { path: 'map', element: <MapView /> },
      { path: 'entities', element: <EntitiesView /> },
      { path: 'inventory', element: <InventoryView /> },
      { path: 'routines', element: <RoutinesView /> },
      { path: 'settings', element: <SettingsView /> },
    ],
  },
]);
