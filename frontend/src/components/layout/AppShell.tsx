import { Outlet } from 'react-router-dom';
import IconRail from './IconRail';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import { useWebSocketSync } from '../../hooks/useWebSocketSync';
import { useOfflineSync } from '../../hooks/useOfflineSync';

export default function AppShell() {
  // Establish WebSocket sync connection for real-time status updates.
  // Gracefully degrades to "synced" state when backend is unavailable.
  useWebSocketSync();

  // Listen for browser online/offline events and flush pending changes.
  useOfflineSync();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex flex-1 min-h-0">
        <IconRail />
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
