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

  const { data: alert } = useQuery({
    queryKey: ['inventory', 'alerts'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AlertData>>('/inventory/alerts');
      return data.data ?? { items: [], count: 0 };
    },
  });

  const activeView = navItems.find((n) => location.pathname.startsWith(n.route))?.view || 'journal';
  const hasInventoryAlert = (alert?.count ?? 0) > 0;

  return (
    <nav className="flex flex-col items-center w-14 shrink-0 bg-sidebar-bg py-3 gap-1">
      {navItems.map((item) => {
        const isActive = activeView === item.view;
        return (
          <Tooltip key={item.view} text={item.tooltip} position="right">
            <button
              onClick={() => navigate(item.route)}
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
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber border border-sidebar-bg" />
              )}
            </button>
          </Tooltip>
        );
      })}

      <div className="mt-auto">
        <Tooltip text={user?.display_name || 'Profile'} position="right">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold text-white font-serif cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--color-coral), var(--color-amber))' }}
          >
            {user?.avatar_initials || '?'}
          </div>
        </Tooltip>
      </div>
    </nav>
  );
}
