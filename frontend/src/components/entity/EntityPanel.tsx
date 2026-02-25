import { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';
import { useEntity, useEntityTopics, useEntityNotes } from '../../hooks/useEntities';
import { useInventory } from '../../hooks/useInventory';
import type { InventoryItem, NoteSummary } from '../../types';

type Tab = 'entity' | 'linked' | 'map' | 'gear';

export default function EntityPanel() {
  const { entityPanelOpen, toggleEntityPanel } = useUIStore();
  const [activeTab, setActiveTab] = useState<Tab>('entity');

  if (!entityPanelOpen) return null;

  return (
    <div className="w-[280px] flex-shrink-0 border-l border-border bg-parchment flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-light flex-shrink-0">
        <h2 className="font-serif text-[13.5px] font-semibold text-ink">Context Panel</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleEntityPanel}
            className="w-6 h-6 flex items-center justify-center text-ink-muted hover:text-ink rounded transition-colors text-[12px]"
            title="Collapse panel"
          >
            ↗
          </button>
          <button className="w-6 h-6 flex items-center justify-center text-ink-muted hover:text-ink rounded transition-colors text-[13px]">
            ⋮
          </button>
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
// Entity Tab
// ---------------------------------------------------------------------------

function EntityTab() {
  const selectedEntityId = useUIStore((s) => s.selectedEntityId);
  const { data: entity, isLoading: entityLoading } = useEntity(selectedEntityId);
  const { data: topics, isLoading: topicsLoading } = useEntityTopics(selectedEntityId);
  const { data: entityNotes } = useEntityNotes(selectedEntityId);
  const { data: inventoryRes } = useInventory();

  const inventory = inventoryRes?.data ?? [];

  const badStatuses = ['low', 'missing', 'needs_check'];
  const needsAttention = inventory.filter((i) => badStatuses.includes(i.status));
  const readyCount = inventory.filter((i) => !badStatuses.includes(i.status)).length;
  const totalCount = inventory.length;

  // No entity selected
  if (!selectedEntityId) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm px-4 text-center">
        <span className="text-2xl mb-2">👤</span>
        Select an entity to view details
      </div>
    );
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
      <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm px-4 text-center">
        <span className="text-2xl mb-2">🔍</span>
        Entity not found
      </div>
    );
  }

  return (
    <div className="px-3 pb-4 space-y-3">
      {/* ── Avatar + name + role ── */}
      <div className="bg-white p-3.5 rounded-[10px] border border-border-light shadow-[0_1px_3px_rgba(0,0,0,.04)] flex items-center gap-3">
        <div
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white text-[14px] font-serif font-semibold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--color-coral), var(--color-amber))' }}
        >
          {entity.avatar_initials}
        </div>
        <div className="min-w-0">
          <h3 className="font-serif font-semibold text-[14px] text-ink leading-tight">{entity.name}</h3>
          {entity.role && (
            <p className="text-[11.5px] text-ink-muted leading-tight mt-0.5">{entity.role}</p>
          )}
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
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest flex items-center gap-1">
            <span>📍</span> Location
          </span>
          <button className="text-[11px] text-ink-muted hover:text-ink cursor-pointer transition-colors">
            ⤢
          </button>
        </div>
        <CSSMiniMap />
      </div>

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
      <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm px-4 text-center">
        <span className="text-2xl mb-2">🔗</span>
        Select an entity to view linked notes
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
      <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm px-4 text-center">
        <span className="text-2xl mb-2">📝</span>
        No linked notes yet
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
  const selectedEntityId = useUIStore((s) => s.selectedEntityId);
  const { data: entity } = useEntity(selectedEntityId);

  return (
    <div className="px-3 pb-4">
      <h4 className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest mb-3 mt-1">
        Location Map
      </h4>
      <CSSMiniMap large />
      <p className="text-[10px] text-ink-ghost text-center mt-2">
        {entity
          ? `Showing locations linked to ${entity.name}`
          : 'Select an entity to view their locations'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gear Tab
// ---------------------------------------------------------------------------

function GearTab() {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm px-4 text-center">
      <span className="text-2xl mb-2">⚙</span>
      Entity settings coming soon
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
  // ready / charged / packed
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
// CSS-drawn mini map (no Mapbox — purely CSS/SVG with location pins)
// ---------------------------------------------------------------------------

interface MapPin {
  label: string;
  x: number; // percentage
  y: number;
  color: string;
  active?: boolean;
}

const MAP_PINS: MapPin[] = [
  { label: 'Kandy', x: 52, y: 30, color: 'var(--color-coral)', active: true },
  { label: 'Galle', x: 38, y: 72, color: 'var(--color-sage)' },
  { label: 'Ella', x: 64, y: 65, color: 'var(--color-amber)' },
  { label: 'Colombo', x: 22, y: 55, color: 'var(--color-sage)' },
];

function CSSMiniMap({ large = false }: { large?: boolean }) {
  const height = large ? 200 : 130;

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-border-light"
      style={{
        height,
        background: 'linear-gradient(160deg, #e8f0ea 0%, #d4e4d8 40%, #c8d8cc 100%)',
      }}
    >
      {/* Road lines (decorative) */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Connection lines between pins */}
        <line x1="52" y1="30" x2="38" y2="72" stroke="rgba(107,140,122,.4)" strokeWidth="0.8" strokeDasharray="2,1.5" />
        <line x1="52" y1="30" x2="64" y2="65" stroke="rgba(196,132,74,.35)" strokeWidth="0.8" strokeDasharray="2,1.5" />
        <line x1="52" y1="30" x2="22" y2="55" stroke="rgba(107,140,122,.3)" strokeWidth="0.8" strokeDasharray="2,1.5" />
        {/* Stylised terrain patches */}
        <ellipse cx="60" cy="20" rx="18" ry="10" fill="rgba(107,140,122,.15)" />
        <ellipse cx="30" cy="80" rx="15" ry="8" fill="rgba(107,140,122,.1)" />
        <ellipse cx="75" cy="55" rx="12" ry="9" fill="rgba(107,140,122,.12)" />
        {/* Coastline hint */}
        <path d="M0 90 Q10 75 20 80 Q30 85 35 78 Q40 72 38 72 Q36 80 30 88 Q20 95 10 100 Z" fill="rgba(100,160,200,.15)" />
      </svg>

      {/* Pins */}
      {MAP_PINS.map((pin) => (
        <div
          key={pin.label}
          className="absolute flex flex-col items-center"
          style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)' }}
        >
          {/* Pin dot */}
          <div
            className="rounded-full border-2 border-white shadow-sm"
            style={{
              width: pin.active ? 10 : 7,
              height: pin.active ? 10 : 7,
              background: pin.color,
              boxShadow: pin.active ? `0 0 0 3px ${pin.color}33` : undefined,
            }}
          />
          {/* Label */}
          <span
            className="text-[8.5px] font-medium whitespace-nowrap mt-0.5 px-1 py-0.5 rounded"
            style={{
              color: pin.active ? 'var(--color-coral)' : 'var(--color-ink-muted, #8a7d6e)',
              background: 'rgba(255,255,255,.75)',
              fontWeight: pin.active ? 600 : 400,
            }}
          >
            {pin.label}
          </span>
        </div>
      ))}

      {/* Legend */}
      <div className="absolute bottom-1.5 left-2 flex items-center gap-2">
        <LegendDot color="var(--color-coral)" label="Active" />
        <LegendDot color="var(--color-sage)" label="Visited" />
        <LegendDot color="var(--color-amber)" label="Surveyed" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[8px] text-ink-muted font-medium">{label}</span>
    </div>
  );
}
