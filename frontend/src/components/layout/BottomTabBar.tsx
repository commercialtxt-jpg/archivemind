import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';

interface Tab {
  icon: string;
  label: string;
  route: string | null; // null = menu button (opens drawer)
}

const TABS: Tab[] = [
  { icon: '☰', label: 'Menu', route: null },
  { icon: '📓', label: 'Journal', route: '/journal' },
  { icon: '👤', label: 'Entities', route: '/entities' },
  { icon: '🗺', label: 'Map', route: '/map' },
  { icon: '🎒', label: 'Inventory', route: '/inventory' },
];

export default function BottomTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { toggleDrawer } = useUIStore();

  const isActive = (route: string | null) => {
    if (!route) return false;
    // Never highlight a regular tab when on settings
    if (pathname.startsWith('/settings')) return false;
    if (route === '/journal') return pathname === '/' || pathname.startsWith('/journal');
    return pathname.startsWith(route);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-sidebar-bg border-t border-border-light pb-safe"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch h-16">
        {TABS.map((tab) => {
          const active = isActive(tab.route);

          return (
            <button
              key={tab.label}
              onClick={() => {
                if (tab.route === null) {
                  toggleDrawer();
                } else {
                  navigate(tab.route);
                }
              }}
              className={`
                flex flex-col items-center justify-center flex-1 gap-0.5 min-w-[44px] min-h-[44px]
                text-[10px] font-medium transition-colors duration-150 cursor-pointer relative
                ${active ? 'text-coral' : 'text-ink-muted hover:text-ink-mid'}
              `}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="text-[20px] leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
              {/* Active indicator dot */}
              {active && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-coral"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
