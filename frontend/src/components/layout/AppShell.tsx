import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import IconRail from './IconRail';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import BottomTabBar from './BottomTabBar';
import MobileDrawer from './MobileDrawer';
import UpgradePrompt from '../shared/UpgradePrompt';
import InstallPrompt from '../ui/InstallPrompt';
import { useWebSocketSync } from '../../hooks/useWebSocketSync';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useIsMobile } from '../../hooks/useMediaQuery';

export default function AppShell() {
  useWebSocketSync();
  useOfflineSync();

  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const showSidebar = pathname === '/' || pathname.startsWith('/journal');

  // Global plan-limit error listener
  const [limitError, setLimitError] = useState<{ resource: string; message: string } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setLimitError(detail);
    };
    window.addEventListener('plan-limit-error', handler);
    return () => window.removeEventListener('plan-limit-error', handler);
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex flex-1 min-h-0">
        {!isMobile && <IconRail />}
        {!isMobile && showSidebar && <Sidebar />}
        <main className={`flex-1 min-w-0 overflow-hidden${isMobile ? ' pb-16' : ''}`}>
          <Outlet />
        </main>
      </div>
      {!isMobile && <StatusBar />}
      {isMobile && <BottomTabBar />}
      {isMobile && <MobileDrawer />}

      {/* Plan limit upgrade prompt */}
      {limitError && (
        <UpgradePrompt
          resource={limitError.resource}
          message={limitError.message}
          onDismiss={() => setLimitError(null)}
        />
      )}

      <InstallPrompt />
    </div>
  );
}
