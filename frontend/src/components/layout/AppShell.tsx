import { Outlet, useLocation } from 'react-router-dom';
import IconRail from './IconRail';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import { useWebSocketSync } from '../../hooks/useWebSocketSync';
import { useOfflineSync } from '../../hooks/useOfflineSync';

export default function AppShell() {
  useWebSocketSync();
  useOfflineSync();

  const { pathname } = useLocation();
  const showSidebar = pathname === '/' || pathname.startsWith('/journal');

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex flex-1 min-h-0">
        <IconRail />
        {showSidebar && <Sidebar />}
        <main className="flex-1 min-w-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
