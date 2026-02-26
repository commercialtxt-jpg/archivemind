import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';
import { useEntities, useEntity, useEntityTopics, useEntityNotes } from '../../hooks/useEntities';
import { useInventory, useUpdateInventoryItem } from '../../hooks/useInventory';
import { useMapLocations } from '../../hooks/useMap';
import type { Entity, InventoryItem, NoteSummary, MapLocation } from '../../types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

type Tab = 'entity' | 'linked' | 'map' | 'gear';

// ---------------------------------------------------------------------------
// Root panel
// ---------------------------------------------------------------------------

export default function EntityPanel() {
  const { entityPanelOpen, toggleEntityPanel } = useUIStore();
  const [activeTab, setActiveTab] = useState<Tab>('entity');
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { selectedEntityId, setSelectedEntityId } = useUIStore();

  // Close overflow menu on outside click
  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && overflowRef.current.contains(e.target as Node)) return;
      setOverflowOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  if (!entityPanelOpen) {
    return (
      <button
        onClick={toggleEntityPanel}
        title="Open Context Panel"
        className="flex-shrink-0 w-8 bg-panel-bg border-l border-border flex flex-col items-center justify-center gap-3 cursor-pointer group hover:bg-parchment transition-colors"
        style={{ minHeight: 0 }}
      >
        {/* Expand arrow */}
        <span
          className="text-ink-muted group-hover:text-coral transition-colors text-[13px] font-bold leading-none select-none"
          aria-hidden="true"
        >
          ↙
        </span>
        {/* Vertical label */}
        <span
          className="text-[9.5px] font-semibold text-ink-ghost group-hover:text-ink-muted uppercase tracking-[0.12em] transition-colors select-none"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
        >
          Context
        </span>
      </button>
    );
  }

  return (
    <div className="w-[280px] flex-shrink-0 border-l border-border bg-parchment flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-light flex-shrink-0">
        <h2 className="font-serif text-[13.5px] font-semibold text-ink">Context Panel</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleEntityPanel}
            className="w-6 h-6 flex items-center justify-center text-ink-muted hover:text-coral hover:bg-coral/10 rounded transition-colors text-[13px] cursor-pointer"
            title="Collapse panel"
          >
            ↗
          </button>
          {/* Overflow menu */}
          <div className="relative" ref={overflowRef}>
            <button
              onClick={() => setOverflowOpen((o) => !o)}
              className="w-6 h-6 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-sand rounded transition-colors text-[13px] cursor-pointer"
              title="More options"
              aria-haspopup="true"
              aria-expanded={overflowOpen}
            >
              ⋮
            </button>
            {overflowOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg border border-border shadow-lg z-50 py-1 overflow-hidden"
                role="menu"
              >
                <button
                  onClick={() => {
                    navigate('/entities');
                    setOverflowOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[12px] text-ink hover:bg-parchment transition-colors cursor-pointer"
                  role="menuitem"
                >
                  View all entities
                </button>
                {selectedEntityId && (
                  <button
                    onClick={() => {
                      setSelectedEntityId(null);
                      setOverflowOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[12px] text-ink hover:bg-parchment transition-colors cursor-pointer"
                    role="menuitem"
                  >
                    Deselect entity
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pill tab bar */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'entity' && <EntityTab />}
        {activeTab === 'linked' && <LinkedTab />}
        {activeTab === 'map' && <MapTab />}
        {activeTab === 'gear' && <GearTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

function TabBar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'entity', label: 'Entity' },
    { key: 'linked', label: 'Linked' },
    { key: 'map', label: 'Map' },
    { key: 'gear', label: 'Gear' },
  ];

  return (
    <div className="flex gap-0.5 px-2.5 py-2 flex-shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`
            px-2.5 py-[5px] rounded-[6px] text-[11.5px] font-medium transition-all cursor-pointer
            ${activeTab === tab.key
              ? 'bg-white text-coral font-semibold shadow-[0_1px_3px_rgba(0,0,0,.06)]'
              : 'text-ink-muted hover:bg-sand'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entity browser (shown when no entity is selected)
// ---------------------------------------------------------------------------

function EntityBrowser() {
  const { setSelectedEntityId } = useUIStore();
  const { data: entitiesRes, isLoading } = useEntities();
  const entities = entitiesRes?.data ?? [];

  const entityTypeIcon = (type: string) => {
    if (type === 'person') return '👤';
    if (type === 'location') return '📍';
    if (type === 'artifact') return '🔮';
    return '🔘';
  };

  const entityTypeColor = (type: string) => {
    if (type === 'person') return 'var(--color-coral)';
    if (type === 'location') return 'var(--color-sage)';
    return 'var(--color-amber)';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm">
        <div className="w-5 h-5 border-2 border-coral/30 border-t-coral rounded-full animate-spin mb-2" />
        Loading entities...
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm px-4 text-center gap-2">
        <span className="text-3xl">👤</span>
        <p className="leading-snug">No entities yet. Mention people, places, or artifacts in your notes to create entities.</p>
      </div>
    );
  }

  return (
    <div className="px-3 pb-4 space-y-1.5">
      <p className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest mb-2 mt-1">
        All Entities — click to view
      </p>
      {entities.map((entity: Entity) => (
        <button
          key={entity.id}
          onClick={() => setSelectedEntityId(entity.id)}
          className="w-full text-left flex items-center gap-2.5 p-2.5 rounded-lg bg-white border border-border-light hover:border-coral/30 hover:shadow-sm transition-all cursor-pointer group"
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-serif font-semibold flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${entityTypeColor(entity.entity_type)}, ${entityTypeColor(entity.entity_type)}99)` }}
          >
            {entity.avatar_initials || entity.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-serif font-medium text-ink leading-tight group-hover:text-coral transition-colors">
              {entity.name}
            </p>
            <p className="text-[10.5px] text-ink-ghost mt-0.5 flex items-center gap-1">
              <span>{entityTypeIcon(entity.entity_type)}</span>
              <span className="capitalize">{entity.entity_type}</span>
              {entity.role && <span className="text-ink-ghost">· {entity.role}</span>}
            </p>
          </div>
          <span className="text-[10px] text-ink-ghost opacity-0 group-hover:opacity-100 transition-opacity">→</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entity Tab
// ---------------------------------------------------------------------------

function EntityTab() {
  const selectedEntityId = useUIStore((s) => s.selectedEntityId);
  const { setSelectedEntityId } = useUIStore();
  const navigate = useNavigate();
  const { data: entity, isLoading: entityLoading } = useEntity(selectedEntityId);
  const { data: topics, isLoading: topicsLoading } = useEntityTopics(selectedEntityId);
  const { data: entityNotes } = useEntityNotes(selectedEntityId);
  const { data: inventoryRes } = useInventory();

  const inventory = inventoryRes?.data ?? [];

  const badStatuses = ['low', 'missing', 'needs_check'];
  const needsAttention = inventory.filter((i) => badStatuses.includes(i.status));
  const readyCount = inventory.filter((i) => !badStatuses.includes(i.status)).length;
  const totalCount = inventory.length;

  // No entity selected — show the entity browser
  if (!selectedEntityId) {
    return <EntityBrowser />;
  }

  // Loading state
  if (entityLoading || topicsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm">
        <div className="w-5 h-5 border-2 border-coral/30 border-t-coral rounded-full animate-spin mb-2" />
        Loading...
      </div>
    );
  }

  // Entity not found
  if (!entity) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm px-4 text-center gap-2">
        <span className="text-2xl">🔍</span>
        <p>Entity not found.</p>
        <button
          onClick={() => setSelectedEntityId(null)}
          className="text-[11px] text-coral hover:underline cursor-pointer mt-1"
        >
          Back to entity list
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 pb-4 space-y-3">
      {/* ── Back link ── */}
      <button
        onClick={() => setSelectedEntityId(null)}
        className="flex items-center gap-1 text-[10.5px] text-ink-muted hover:text-coral transition-colors cursor-pointer mt-1"
      >
        <span>←</span>
        <span>All entities</span>
      </button>

      {/* ── Avatar + name + role ── */}
      <div className="bg-white p-3.5 rounded-[10px] border border-border-light shadow-[0_1px_3px_rgba(0,0,0,.04)] flex items-center gap-3">
        <div
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white text-[14px] font-serif font-semibold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--color-coral), var(--color-amber))' }}
        >
          {entity.avatar_initials || entity.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="font-serif font-semibold text-[14px] text-ink leading-tight">{entity.name}</h3>
          {entity.role && (
            <p className="text-[11.5px] text-ink-muted leading-tight mt-0.5">{entity.role}</p>
          )}
          <p className="text-[10px] text-ink-ghost mt-0.5 capitalize">{entity.entity_type}</p>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="MENTIONS" value={entity.total_mentions ?? 0} />
        <StatCard label="SESSIONS" value={entity.session_count ?? 0} />
        <StatCard label="CONCEPTS" value={entity.concept_count ?? 0} />
      </div>

      {/* ── Topics section ── */}
      {topics && topics.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest mb-2">
            Associated Topics
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] bg-white text-ink-mid border border-border-light cursor-default hover:border-coral/40 transition-colors"
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Location mini-map ── */}
      <EntityTabMiniMap entityId={selectedEntityId} entityNotes={entityNotes} onExpand={() => navigate('/map')} />

      {/* ── Inventory alert ── */}
      {needsAttention.length > 0 && (
        <div
          className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[11px] text-coral"
          style={{
            background: 'rgba(207,106,76,.06)',
            border: '1px solid rgba(207,106,76,.15)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span>⚠</span>
            <span>Items need attention</span>
          </div>
          <span
            className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
            style={{ background: 'var(--color-coral)' }}
          >
            {needsAttention.length}
          </span>
        </div>
      )}

      {/* ── Field Kit Status ── */}
      {inventory.length > 0 && (
        <div className="bg-white p-3 rounded-lg border border-border-light">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11.5px] font-semibold text-ink">🎒 Field Kit Status</span>
            <span className="text-[11px] font-semibold text-sage">{readyCount}/{totalCount} Ready</span>
          </div>
          <div className="space-y-1.5">
            {inventory.map((item: InventoryItem) => (
              <div key={item.id} className="flex items-center gap-2 text-[11.5px]">
                <span className="text-[12px] w-4 text-center flex-shrink-0">{item.icon}</span>
                <span className="flex-1 text-ink-mid truncate">{item.name}</span>
                <InventoryStatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Connected notes ── */}
      {entityNotes && entityNotes.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest mb-2">
            Connected Notes
          </h4>
          <div className="space-y-1.5">
            {entityNotes.map((note) => (
              <ConnectedNoteCard key={note.id} note={note} />
            ))}
          </div>
        </div>
      )}

      {entityNotes && entityNotes.length === 0 && topics && topics.length === 0 && (
        <p className="text-[11px] text-ink-ghost text-center py-4">
          No notes or topics linked to this entity yet.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Linked Tab
// ---------------------------------------------------------------------------

function LinkedTab() {
  const selectedEntityId = useUIStore((s) => s.selectedEntityId);
  const setActiveNoteId = useEditorStore((s) => s.setActiveNoteId);
  const { data: entityNotes, isLoading } = useEntityNotes(selectedEntityId);

  if (!selectedEntityId) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm px-4 text-center gap-2">
        <span className="text-2xl">🔗</span>
        <p>Select an entity from the <strong>Entity</strong> tab to see its linked notes.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm">
        <div className="w-5 h-5 border-2 border-coral/30 border-t-coral rounded-full animate-spin mb-2" />
        Loading...
      </div>
    );
  }

  if (!entityNotes || entityNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm px-4 text-center gap-2">
        <span className="text-2xl">📝</span>
        No linked notes yet. Mention this entity in a note to link them.
      </div>
    );
  }

  return (
    <div className="px-3 pb-4">
      <h4 className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest mb-3 mt-1">
        All Linked Notes
      </h4>
      <div className="space-y-2">
        {entityNotes.map((note) => (
          <button
            key={note.id}
            onClick={() => setActiveNoteId(note.id)}
            className="w-full text-left p-2.5 rounded-lg bg-white border border-border-light hover:border-coral/30 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-start gap-2">
              <span className="text-[13px] mt-0.5 flex-shrink-0">{noteTypeIcon(note.note_type)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-serif font-medium text-ink line-clamp-1">
                  {note.title || 'Untitled'}
                </p>
                {note.body_text && (
                  <p className="text-[11px] text-ink-ghost mt-0.5 line-clamp-1">
                    {note.body_text}
                  </p>
                )}
              </div>
              <StrengthBars strength={noteStrength(note)} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Map Tab
// ---------------------------------------------------------------------------

function MapTab() {
  const navigate = useNavigate();
  const selectedEntityId = useUIStore((s) => s.selectedEntityId);
  const { data: entity } = useEntity(selectedEntityId);
  const { data: entityNotes } = useEntityNotes(selectedEntityId);
  const { data: mapLocations = [] } = useMapLocations();

  // Show all locations when no entity is selected, or filter to entity's locations
  const relevantLocations = selectedEntityId
    ? (() => {
        const entityNoteIds = new Set((entityNotes ?? []).map((n) => n.id));
        return mapLocations.filter(
          (l) =>
            (l.source_type === 'entity' && l.source_id === selectedEntityId) ||
            (l.source_type === 'note' && entityNoteIds.has(l.source_id)),
        );
      })()
    : mapLocations;

  return (
    <div className="px-3 pb-4">
      <MapboxMiniMap
        locations={relevantLocations}
        height={200}
        label="Location Map"
        onExpand={() => navigate('/map')}
      />
      <p className="text-[10px] text-ink-ghost text-center mt-2">
        {entity
          ? `Showing locations linked to ${entity.name}`
          : `Showing all ${relevantLocations.length} field locations`}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gear Tab
// ---------------------------------------------------------------------------

function GearTab() {
  const { data: inventoryRes } = useInventory();
  const updateItem = useUpdateInventoryItem();
  const navigate   = useNavigate();

  const items      = inventoryRes?.data ?? [];
  const badStatuses = ['low', 'missing'];
  const alertItems = items.filter((i) => badStatuses.includes(i.status));
  const readyCount = items.filter((i) => !badStatuses.includes(i.status)).length;
  const pct        = items.length > 0 ? Math.round((readyCount / items.length) * 100) : 0;

  const STATUS_CYCLE = ['packed', 'ready', 'charged', 'low', 'missing'];
  const cycleStatus  = (id: string, current: string) => {
    const idx  = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    updateItem.mutate({ id, status: next });
  };

  if (items.length === 0) {
    return (
      <div className="px-3 pb-4">
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <span className="text-2xl">🎒</span>
          <p className="text-[12px] text-ink-ghost leading-snug max-w-[180px]">
            No inventory items yet.{' '}
            <button
              onClick={() => navigate('/inventory')}
              className="text-coral hover:underline cursor-pointer"
            >
              Add items
            </button>
            {' '}to track your field kit.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-4 space-y-3">
      {/* Summary stats */}
      <div className="bg-white p-3 rounded-lg border border-border-light">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold text-ink">🎒 Field Kit</span>
          <button
            onClick={() => navigate('/inventory')}
            className="text-[10px] text-coral hover:text-coral-dark cursor-pointer font-medium"
          >
            View all →
          </button>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[13px] font-semibold text-sage font-mono">{readyCount}/{items.length}</span>
          <span className="text-[11px] text-ink-ghost">ready</span>
        </div>
        <div className="h-1.5 rounded-full bg-sand overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? 'var(--color-sage)' : pct >= 70 ? 'var(--color-amber)' : 'var(--color-coral)',
            }}
          />
        </div>
      </div>

      {/* Alert items */}
      {alertItems.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest mb-2">
            Needs Attention
          </h4>
          <div className="space-y-1.5">
            {alertItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-border-light">
                <span className="text-[14px] flex-shrink-0">{item.icon}</span>
                <span className="flex-1 text-[12px] text-ink truncate">{item.name}</span>
                <button
                  onClick={() => cycleStatus(item.id, item.status)}
                  title="Click to change status"
                  className={`
                    text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border cursor-pointer transition-all hover:opacity-75
                    ${item.status === 'missing' ? 'bg-coral/10 text-coral border-coral/25' : 'bg-amber/10 text-amber border-amber/25'}
                  `}
                >
                  {item.status}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All items (collapsed view) */}
      <div>
        <h4 className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest mb-2">
          All Items
        </h4>
        <div className="space-y-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-[11.5px]">
              <span className="text-[12px] w-4 text-center flex-shrink-0">{item.icon}</span>
              <span className="flex-1 text-ink-mid truncate">{item.name}</span>
              <InventoryStatusBadge status={item.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-border-light p-2 text-center">
      <div className="text-[17px] font-semibold text-ink font-mono leading-tight">{value}</div>
      <div className="text-[9px] text-ink-muted uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

function InventoryStatusBadge({ status }: { status: string }) {
  if (status === 'missing') {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-coral flex-shrink-0">
        <span>✗</span>
        <span>Missing</span>
      </span>
    );
  }
  if (status === 'low') {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber flex-shrink-0">
        <span>⚡</span>
        <span>Low</span>
      </span>
    );
  }
  if (status === 'needs_check') {
    return (
      <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber flex-shrink-0">
        <span>?</span>
        <span>Check</span>
      </span>
    );
  }
  const label =
    status === 'charged' ? 'Charged'
    : status === 'packed' ? 'Packed'
    : 'Ready';
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-medium text-sage flex-shrink-0">
      <span>✓</span>
      <span>{label}</span>
    </span>
  );
}

function StrengthBars({ strength }: { strength: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-[2px] items-end flex-shrink-0 self-center">
      <div
        className="w-[3px] rounded-sm"
        style={{
          height: '12px',
          backgroundColor: 'var(--color-coral)',
          opacity: strength >= 1 ? 1 : 0.15,
        }}
      />
      <div
        className="w-[3px] rounded-sm"
        style={{
          height: '9px',
          backgroundColor: 'var(--color-coral)',
          opacity: strength >= 2 ? 0.65 : 0.15,
        }}
      />
      <div
        className="w-[3px] rounded-sm"
        style={{
          height: '6px',
          backgroundColor: 'var(--color-coral)',
          opacity: strength >= 3 ? 0.35 : 0.1,
        }}
      />
    </div>
  );
}

function ConnectedNoteCard({ note }: { note: NoteSummary }) {
  const setActiveNoteId = useEditorStore((s) => s.setActiveNoteId);

  return (
    <button
      onClick={() => setActiveNoteId(note.id)}
      className="w-full text-left p-2.5 rounded-lg bg-white border border-border-light hover:border-coral/30 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <span className="text-[12px] flex-shrink-0">{noteTypeIcon(note.note_type)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-serif font-medium text-ink line-clamp-1 leading-tight">
            {note.title || 'Untitled'}
          </p>
          {note.body_text && (
            <p className="text-[10.5px] text-ink-ghost mt-0.5 line-clamp-1">
              {note.body_text}
            </p>
          )}
        </div>
        <StrengthBars strength={noteStrength(note)} />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function noteTypeIcon(noteType: string): string {
  switch (noteType) {
    case 'interview': return '🎙';
    case 'photo': return '📷';
    case 'voice_memo': return '🎤';
    case 'field_note': return '📋';
    default: return '📝';
  }
}

/** Derive a 1–3 strength value from a NoteSummary. Uses is_starred and recency as proxy. */
function noteStrength(note: NoteSummary): 1 | 2 | 3 {
  const ageMs = Date.now() - new Date(note.created_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (note.is_starred || ageDays < 3) return 3;
  if (ageDays < 14) return 2;
  return 1;
}

// ---------------------------------------------------------------------------
// Mapbox mini map — replaces the old CSS-drawn mini map
// ---------------------------------------------------------------------------

interface MapboxMiniMapProps {
  locations: MapLocation[];
  height?: number;
  onExpand?: () => void;
  label?: string;
}

function pinColorForLoc(loc: MapLocation): string {
  if (loc.source_type === 'entity') return '#6B8C7A';
  switch (loc.note_type) {
    case 'interview': return '#CF6A4C';
    case 'voice_memo': return '#6B8C7A';
    case 'photo': return '#CF6A4C';
    default: return '#C4844A';
  }
}

function MapboxMiniMap({ locations, height = 140, onExpand, label }: MapboxMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const token = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
  const hasToken = !!token;

  useEffect(() => {
    if (!containerRef.current || !hasToken) return;

    // Destroy previous map if re-mounting
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [80.6, 7.5],
      zoom: 6,
      interactive: false,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      // Remove stale markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (locations.length === 0) return;

      // Add markers
      const bounds = new mapboxgl.LngLatBounds();
      locations.forEach((loc) => {
        const color = pinColorForLoc(loc);
        const el = document.createElement('div');
        el.style.cssText = `
          width: 10px; height: 10px; border-radius: 50%;
          background: ${color};
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.28);
        `;
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([loc.lng, loc.lat])
          .addTo(map);
        markersRef.current.push(marker);
        bounds.extend([loc.lng, loc.lat]);
      });

      // Fit bounds to markers
      if (locations.length === 1) {
        map.setCenter([locations[0].lng, locations[0].lat]);
        map.setZoom(9);
      } else if (locations.length > 1) {
        map.fitBounds(bounds, { padding: 32, maxZoom: 12, animate: false });
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken, JSON.stringify(locations.map((l) => l.id))]);

  if (!hasToken) {
    return (
      <div
        className="rounded-xl border border-border-light flex items-center justify-center text-[11px] text-ink-ghost"
        style={{ height, background: '#f0ede8' }}
      >
        Map requires VITE_MAPBOX_TOKEN
      </div>
    );
  }

  return (
    <div>
      {(label || onExpand) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest flex items-center gap-1">
              <span>📍</span> {label}
            </span>
          )}
          {onExpand && (
            <button
              onClick={onExpand}
              className="text-[11px] text-ink-muted hover:text-coral cursor-pointer transition-colors"
              title="Open full map"
            >
              ⤢ Expand
            </button>
          )}
        </div>
      )}
      <div
        className="rounded-xl overflow-hidden border border-border-light"
        style={{ height }}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EntityTab mini-map sub-component (uses real map data)
// ---------------------------------------------------------------------------

function EntityTabMiniMap({
  entityId,
  entityNotes,
  onExpand,
}: {
  entityId: string | null;
  entityNotes?: NoteSummary[];
  onExpand?: () => void;
}) {
  const { data: mapLocations = [] } = useMapLocations();

  const entityNoteIds = new Set((entityNotes ?? []).map((n) => n.id));
  const relevantLocations = mapLocations.filter(
    (l) =>
      (l.source_type === 'entity' && l.source_id === entityId) ||
      (l.source_type === 'note' && entityNoteIds.has(l.source_id)),
  );

  return (
    <MapboxMiniMap
      locations={relevantLocations}
      height={140}
      label="Location"
      onExpand={onExpand}
    />
  );
}
