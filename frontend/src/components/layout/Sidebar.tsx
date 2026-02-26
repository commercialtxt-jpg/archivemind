import { useCallback, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useNoteCounts } from '../../hooks/useNotes';
import { useFieldTrips, useCreateFieldTrip, useDeleteFieldTrip } from '../../hooks/useFieldTrips';
import { useConcepts, useCreateConcept, useDeleteConcept } from '../../hooks/useConcepts';
import SyncStatus from '../ui/SyncStatus';

// ---------------------------------------------------------------------------
// SidebarContent — shared between desktop Sidebar and mobile MobileDrawer
// ---------------------------------------------------------------------------

interface SidebarContentProps {
  /** Called after any navigation/filter item is clicked. Used by MobileDrawer to auto-close. */
  onItemClick?: () => void;
}

export function SidebarContent({ onItemClick }: SidebarContentProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { sidebarFilter, setSidebarFilter, setSearchQuery } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: counts } = useNoteCounts();
  const [search, setSearch] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // --- Field trips ---
  const { data: fieldTrips } = useFieldTrips();
  const createFieldTrip = useCreateFieldTrip();
  const deleteFieldTrip = useDeleteFieldTrip();
  const [ftFormOpen, setFtFormOpen] = useState(false);
  const [ftName, setFtName] = useState('');
  const ftInputRef = useRef<HTMLInputElement>(null);

  // --- Concepts ---
  const { data: concepts } = useConcepts();
  const createConcept = useCreateConcept();
  const deleteConcept = useDeleteConcept();
  const [conceptFormOpen, setConceptFormOpen] = useState(false);
  const [conceptName, setConceptName] = useState('');
  const conceptInputRef = useRef<HTMLInputElement>(null);


  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => setSearchQuery(e.target.value), 300);
    },
    [setSearchQuery]
  );

  const isActive = (type: string, id?: string) =>
    sidebarFilter.type === type && sidebarFilter.id === id;

  // Navigate to journal when selecting any note-related filter, regardless of current page
  const selectNoteFilter = (filter: Parameters<typeof setSidebarFilter>[0]) => {
    setSidebarFilter(filter);
    navigate('/journal');
    onItemClick?.();
  };

  // Field trip form submit
  const handleFtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = ftName.trim();
    if (!name) return;
    createFieldTrip.mutate({ name, icon: '📍' });
    setFtName('');
    setFtFormOpen(false);
  };

  // Concept form submit
  const handleConceptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = conceptName.trim();
    if (!name) return;
    createConcept.mutate({ name, icon: '🏷' });
    setConceptName('');
    setConceptFormOpen(false);
  };


  return (
    <>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center mb-1">
          <span className="font-serif text-[15px] font-semibold tracking-tight">
            <span className="text-coral">Archive</span><span className="text-ink">Mind</span>
          </span>
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
            active={isActive('all')}
            onClick={() => selectNoteFilter({ type: 'all' })}
          />
          <SidebarItem
            icon="⭐" label="Starred" count={counts?.starred}
            active={isActive('starred')}
            onClick={() => selectNoteFilter({ type: 'starred' })}
          />
          <SidebarItem
            icon="🗑" label="Trash" count={counts?.deleted || undefined}
            active={isActive('trash')}
            onClick={() => selectNoteFilter({ type: 'trash' })}
          />
        </section>

        {/* Field Trips */}
        <section>
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
              Field Trips
            </h3>
            <button
              onClick={() => {
                setFtFormOpen((o) => !o);
                setTimeout(() => ftInputRef.current?.focus(), 50);
              }}
              className="w-4 h-4 flex items-center justify-center rounded text-ink-muted hover:text-coral hover:bg-glow-coral transition-all cursor-pointer text-[14px] leading-none"
              title="New field trip"
            >
              +
            </button>
          </div>

          {/* Inline create form */}
          {ftFormOpen && (
            <form onSubmit={handleFtSubmit} className="px-2 mb-2">
              <div className="flex gap-1">
                <input
                  ref={ftInputRef}
                  value={ftName}
                  onChange={(e) => setFtName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setFtFormOpen(false)}
                  placeholder="Trip name..."
                  className="flex-1 text-[12px] px-2 py-1 bg-white border border-border rounded-md
                    focus:border-coral outline-none transition-colors"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!ftName.trim() || createFieldTrip.isPending}
                  className="px-2 py-1 text-[11px] bg-coral text-white rounded-md font-medium
                    disabled:opacity-50 cursor-pointer hover:bg-coral/90 transition-colors"
                >
                  Add
                </button>
              </div>
            </form>
          )}

          {fieldTrips?.map((ft) => (
            <SidebarItemWithDelete
              key={ft.id}
              icon={ft.icon} label={ft.name} count={ft.note_count}
              active={isActive('field_trip', ft.id)}
              onClick={() => selectNoteFilter({ type: 'field_trip', id: ft.id, label: ft.name })}
              onDelete={() => {
                deleteFieldTrip.mutate(ft.id);
                if (sidebarFilter.type === 'field_trip' && sidebarFilter.id === ft.id) {
                  setSidebarFilter({ type: 'all' });
                }
              }}
            />
          ))}

          {(!fieldTrips || fieldTrips.length === 0) && !ftFormOpen && (
            <p className="px-2 text-[11.5px] text-ink-ghost italic">No field trips yet</p>
          )}
        </section>

        {/* Concepts */}
        <section>
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
              Concepts
            </h3>
            <button
              onClick={() => {
                setConceptFormOpen((o) => !o);
                setTimeout(() => conceptInputRef.current?.focus(), 50);
              }}
              className="w-4 h-4 flex items-center justify-center rounded text-ink-muted hover:text-coral hover:bg-glow-coral transition-all cursor-pointer text-[14px] leading-none"
              title="New concept"
            >
              +
            </button>
          </div>

          {/* Inline create form */}
          {conceptFormOpen && (
            <form onSubmit={handleConceptSubmit} className="px-2 mb-2">
              <div className="flex gap-1">
                <input
                  ref={conceptInputRef}
                  value={conceptName}
                  onChange={(e) => setConceptName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setConceptFormOpen(false)}
                  placeholder="Concept name..."
                  className="flex-1 text-[12px] px-2 py-1 bg-white border border-border rounded-md
                    focus:border-coral outline-none transition-colors"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!conceptName.trim() || createConcept.isPending}
                  className="px-2 py-1 text-[11px] bg-coral text-white rounded-md font-medium
                    disabled:opacity-50 cursor-pointer hover:bg-coral/90 transition-colors"
                >
                  Add
                </button>
              </div>
            </form>
          )}

          {concepts?.map((c) => (
            <SidebarItemWithDelete
              key={c.id}
              icon={c.icon} label={c.name} count={c.note_count}
              active={isActive('concept', c.id)}
              onClick={() => selectNoteFilter({ type: 'concept', id: c.id, label: c.name })}
              onDelete={() => {
                deleteConcept.mutate(c.id);
                if (sidebarFilter.type === 'concept' && sidebarFilter.id === c.id) {
                  setSidebarFilter({ type: 'all' });
                }
              }}
            />
          ))}

          {(!concepts || concepts.length === 0) && !conceptFormOpen && (
            <p className="px-2 text-[11.5px] text-ink-ghost italic">No concepts yet</p>
          )}
        </section>

      </div>

      {/* Footer: User account (mobile only) + Settings + Sync status */}
      <div className="border-t border-border-light">
        {/* User account row — only shown in mobile drawer (onItemClick is set by MobileDrawer).
            On desktop the IconRail already renders the user avatar, so we skip it here. */}
        {onItemClick && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center w-full gap-2.5 px-4 py-[10px] text-[13px] transition-all duration-150 cursor-pointer
                text-ink-mid hover:bg-white/60"
              aria-label="User menu"
            >
              <span
                className="flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-semibold text-white font-serif flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--color-coral), var(--color-amber))' }}
              >
                {user?.avatar_initials || '?'}
              </span>
              <span className="flex-1 text-left truncate text-ink">{user?.display_name || 'Account'}</span>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute bottom-full left-2 right-2 z-50 mb-1 bg-warm-white border border-border rounded-lg shadow-card overflow-hidden">
                  <div className="px-3 py-2 border-b border-border-light">
                    <p className="text-[12px] font-medium text-ink truncate">{user?.display_name}</p>
                    <p className="text-[11px] text-ink-ghost truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/settings');
                      onItemClick?.();
                    }}
                    className="w-full text-left px-3 py-2 text-[12px] text-ink-mid hover:bg-parchment transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span>⚙️</span> Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
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
          </div>
        )}

        {/* Settings row — shown in mobile drawer (onItemClick provided by MobileDrawer) */}
        {onItemClick && (
          <button
            onClick={() => {
              if (pathname.startsWith('/settings')) {
                navigate('/journal');
              } else {
                navigate('/settings');
              }
              onItemClick();
            }}
            className={`
              flex items-center w-full gap-2 px-4 py-[10px] text-[13px] transition-all duration-150 cursor-pointer
              ${pathname.startsWith('/settings')
                ? 'bg-white/80 text-coral font-medium'
                : 'text-ink-mid hover:bg-white/60'
              }
            `}
            aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
          >
            <span className="w-5 text-center text-sm">⚙️</span>
            <span className="flex-1 text-left">Settings</span>
            {pathname.startsWith('/settings') && (
              <span className="text-[10px] text-ink-muted">tap to close</span>
            )}
          </button>
        )}
        <SyncStatus />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Desktop Sidebar wrapper
// ---------------------------------------------------------------------------

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-60 shrink-0 bg-sidebar-bg border-r border-border-light overflow-hidden">
      <SidebarContent />
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

function SidebarItemWithDelete({
  icon,
  label,
  count,
  active,
  onClick,
  onDelete,
}: {
  icon: string;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        className={`
          flex items-center w-full gap-2 px-2 py-[7px] rounded-lg text-[13px] transition-all duration-150 cursor-pointer pr-7
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
      {/* Delete button — visible on hover */}
      {hovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center
            rounded text-ink-ghost hover:text-coral hover:bg-coral/10 transition-all cursor-pointer text-[11px]"
          title="Delete"
        >
          ✕
        </button>
      )}
    </div>
  );
}
