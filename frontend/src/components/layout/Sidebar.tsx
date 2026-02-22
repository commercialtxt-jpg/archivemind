import { useCallback, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useNoteCounts } from '../../hooks/useNotes';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import type { ApiResponse, FieldTrip, Concept, Entity } from '../../types';
import SyncStatus from '../ui/SyncStatus';

export default function Sidebar() {
  const { sidebarFilter, setSidebarFilter, setSearchQuery } = useUIStore();
  const { data: counts } = useNoteCounts();
  const [search, setSearch] = useState('');

  const { data: fieldTripsResp } = useQuery({
    queryKey: ['field-trips'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<FieldTrip[]>>('/field-trips');
      return data.data ?? [];
    },
  });

  const { data: conceptsResp } = useQuery({
    queryKey: ['concepts'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Concept[]>>('/concepts');
      return data.data ?? [];
    },
  });

  const { data: personCount } = useQuery({
    queryKey: ['entities', 'person', 'count'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Entity[]>>('/entities?type=person');
      return data.meta?.total ?? 0;
    },
  });

  const { data: locationCount } = useQuery({
    queryKey: ['entities', 'location', 'count'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Entity[]>>('/entities?type=location');
      return data.meta?.total ?? 0;
    },
  });

  const { data: artifactCount } = useQuery({
    queryKey: ['entities', 'artifact', 'count'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Entity[]>>('/entities?type=artifact');
      return data.meta?.total ?? 0;
    },
  });

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      const timeout = setTimeout(() => setSearchQuery(e.target.value), 300);
      return () => clearTimeout(timeout);
    },
    [setSearchQuery]
  );

  const isActive = (type: string, id?: string) =>
    sidebarFilter.type === type && sidebarFilter.id === id;

  return (
    <aside className="flex flex-col w-60 shrink-0 bg-sidebar-bg border-r border-border-light overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg text-white font-serif text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, var(--color-coral), var(--color-amber))' }}
          >
            A
          </div>
          <span className="font-serif text-sm font-semibold text-ink">ArchiveMind</span>
        </div>
        <h2 className="font-serif text-[15px] font-semibold text-ink mb-3">Field Research</h2>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted text-xs">🔍</span>
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={handleSearch}
            className="w-full pl-8 pr-3 py-1.5 text-[12.5px] bg-white/70 border border-border rounded-lg
              focus:bg-white focus:border-coral focus:ring-3 focus:ring-glow-coral outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {/* Workspace */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted px-2 mb-2">
            Workspace
          </h3>
          <SidebarItem
            icon="📓" label="All Notes" count={counts?.total}
            active={isActive('all')} onClick={() => setSidebarFilter({ type: 'all' })}
          />
          <SidebarItem
            icon="⭐" label="Starred" count={counts?.starred}
            active={isActive('starred')} onClick={() => setSidebarFilter({ type: 'starred' })}
          />
          <SidebarItem
            icon="🗑" label="Trash" count={counts?.deleted || undefined}
            active={isActive('trash')} onClick={() => setSidebarFilter({ type: 'trash' })}
          />
        </section>

        {/* Field Trips */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted px-2 mb-2">
            Field Trips
          </h3>
          {fieldTripsResp?.map((ft) => (
            <SidebarItem
              key={ft.id}
              icon={ft.icon} label={ft.name} count={ft.note_count}
              active={isActive('field_trip', ft.id)}
              onClick={() => setSidebarFilter({ type: 'field_trip', id: ft.id, label: ft.name })}
            />
          ))}
        </section>

        {/* Concepts */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted px-2 mb-2">
            Concepts
          </h3>
          {conceptsResp?.map((c) => (
            <SidebarItem
              key={c.id}
              icon={c.icon} label={c.name} count={c.note_count}
              active={isActive('concept', c.id)}
              onClick={() => setSidebarFilter({ type: 'concept', id: c.id, label: c.name })}
            />
          ))}
        </section>

        {/* Entity Types */}
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted px-2 mb-2">
            Entity Types
          </h3>
          <SidebarItem
            icon="🧑" label="Interviewees" count={personCount}
            active={isActive('entity_type', 'person')}
            onClick={() => setSidebarFilter({ type: 'entity_type', id: 'person', label: 'Interviewees' })}
          />
          <SidebarItem
            icon="📍" label="Locations" count={locationCount}
            active={isActive('entity_type', 'location')}
            onClick={() => setSidebarFilter({ type: 'entity_type', id: 'location', label: 'Locations' })}
          />
          <SidebarItem
            icon="🏺" label="Artifacts" count={artifactCount}
            active={isActive('entity_type', 'artifact')}
            onClick={() => setSidebarFilter({ type: 'entity_type', id: 'artifact', label: 'Artifacts' })}
          />
        </section>
      </div>

      {/* Footer: Sync status */}
      <div className="border-t border-border-light">
        <SyncStatus />
      </div>
    </aside>
  );
}

function SidebarItem({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center w-full gap-2 px-2 py-[7px] rounded-lg text-[13px] transition-all duration-150 cursor-pointer
        ${active
          ? 'bg-white text-ink font-medium shadow-sidebar-active'
          : 'text-ink-mid hover:bg-white/60'
        }
      `}
    >
      <span className="w-5 text-center text-sm text-coral">{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`text-[11px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center
            ${active ? 'bg-glow-coral text-coral' : 'bg-sand text-ink-ghost'}
          `}
        >
          {count}
        </span>
      )}
    </button>
  );
}
