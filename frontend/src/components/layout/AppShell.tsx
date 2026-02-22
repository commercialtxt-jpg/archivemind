import { Outlet } from 'react-router-dom';
import IconRail from './IconRail';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import FAB from '../ui/FAB';

export default function AppShell() {
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
      <FAB />
    </div>
  );
}
