import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import Tooltip from '../ui/Tooltip';
import api from '../../lib/api';
import type { View, ApiResponse, InventoryItem } from '../../types';

const navItems: Array<{ icon: string; view: View; route: string; tooltip: string }> = [
  { icon: '📓', view: 'journal', route: '/journal', tooltip: 'Field Journal' },
  { icon: '🕸', view: 'graph', route: '/graph', tooltip: 'Knowledge Graph' },
  { icon: '🗺', view: 'map', route: '/map', tooltip: 'Map View' },
  { icon: '👤', view: 'entities', route: '/entities', tooltip: 'Entities' },
  { icon: '🎒', view: 'inventory', route: '/inventory', tooltip: 'Inventory' },
  { icon: '📋', view: 'routines', route: '/routines', tooltip: 'Routines' },
];

interface AlertData {
  items: InventoryItem[];
  count: number;
}

export default function IconRail() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { data: alert } = useQuery({
    queryKey: ['inventory', 'alerts'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ApiResponse<AlertData>>('/inventory/alerts');
        return data.data ?? { items: [], count: 0 };
      } catch {
        return { items: [], count: 0 };
      }
    },
  });

  const activeView = navItems.find((n) => location.pathname.startsWith(n.route))?.view || 'journal';
  const hasInventoryAlert = (alert?.count ?? 0) > 0;

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate('/login');
  };

  return (
    <nav className="flex flex-col items-center w-14 shrink-0 bg-sidebar-bg py-3 gap-1">
      {navItems.map((item) => {
        const isActive = activeView === item.view;
        return (
          <Tooltip key={item.view} text={item.tooltip} position="right">
            <button
              onClick={() => navigate(item.route)}
              aria-label={item.tooltip}
              aria-current={isActive ? 'page' : undefined}
              className={`
                relative flex items-center justify-center w-10 h-10 rounded-[10px] text-lg
                transition-all duration-150 cursor-pointer
                ${isActive
                  ? 'bg-coral text-white shadow-coral-rail'
                  : 'text-ink-muted hover:bg-sand hover:text-ink'
                }
              `}
            >
              {item.icon}
              {/* Inventory alert badge */}
              {item.view === 'inventory' && hasInventoryAlert && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber border border-sidebar-bg"
                  aria-label={`${alert?.count ?? 0} inventory alert${(alert?.count ?? 0) !== 1 ? 's' : ''}`}
                  role="status"
                />
              )}
            </button>
          </Tooltip>
        );
      })}

      {/* User avatar + logout menu */}
      <div className="mt-auto relative">
        <Tooltip text={showUserMenu ? '' : (user?.display_name || 'Profile')} position="right">
          <button
            type="button"
            onClick={() => setShowUserMenu((v) => !v)}
            className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold text-white font-serif cursor-pointer focus:outline-none focus:ring-2 focus:ring-coral/50"
            style={{ background: 'linear-gradient(135deg, var(--color-coral), var(--color-amber))' }}
            aria-label="User menu"
          >
            {user?.avatar_initials || '?'}
          </button>
        </Tooltip>

        {showUserMenu && (
          <>
            {/* Click-away backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowUserMenu(false)}
            />
            {/* Menu */}
            <div className="absolute bottom-10 left-10 z-50 w-40 bg-warm-white border border-border rounded-lg shadow-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium text-ink truncate">{user?.display_name}</p>
                <p className="text-xs text-ink-ghost truncate">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-xs text-coral hover:bg-parchment transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
