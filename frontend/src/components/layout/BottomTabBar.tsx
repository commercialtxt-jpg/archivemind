import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';

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
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const isActive = (route: string | null) => {
    if (!route) return false;
    if (pathname.startsWith('/settings')) return false;
    if (route === '/journal') return pathname === '/' || pathname.startsWith('/journal');
    return pathname.startsWith(route);
  };

  const isOnSettings = pathname.startsWith('/settings');

  return (
    <>
      {/* Account popup menu */}
      {showAccountMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setShowAccountMenu(false)}
          />
          <div className="fixed bottom-[72px] right-3 z-50 w-44 bg-warm-white border border-border rounded-lg shadow-card overflow-hidden animate-scale-in">
            <div className="px-3 py-2.5 border-b border-border-light">
              <p className="text-[12px] font-medium text-ink truncate">{user?.display_name}</p>
              <p className="text-[11px] text-ink-ghost truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                setShowAccountMenu(false);
                navigate('/settings');
              }}
              className="w-full text-left px-3 py-2 text-[12px] text-ink-mid hover:bg-parchment transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>⚙️</span> Settings
            </button>
            <button
              onClick={() => {
                setShowAccountMenu(false);
                logout();
                navigate('/login');
              }}
              className="w-full text-left px-3 py-2 text-[12px] text-coral hover:bg-parchment transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>↗</span> Sign out
            </button>
          </div>
        </>
      )}

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
                {active && (
                  <span
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-coral"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}

          {/* Account button */}
          <button
            onClick={() => setShowAccountMenu((v) => !v)}
            className={`
              flex flex-col items-center justify-center flex-1 gap-0.5 min-w-[44px] min-h-[44px]
              text-[10px] font-medium transition-colors duration-150 cursor-pointer relative
              ${isOnSettings ? 'text-coral' : 'text-ink-muted hover:text-ink-mid'}
            `}
            aria-label="Account"
          >
            <span
              className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold text-white font-serif"
              style={{ background: 'linear-gradient(135deg, var(--color-coral), var(--color-amber))' }}
            >
              {user?.avatar_initials || '?'}
            </span>
            <span>Account</span>
            {isOnSettings && (
              <span
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-coral"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
