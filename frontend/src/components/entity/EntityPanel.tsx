import { useState } from 'react';
import { useEntity, useEntityNotes, useEntityTopics } from '../../hooks/useEntities';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';
import MiniMap from '../map/MiniMap';
import type { NoteSummary } from '../../types';

type Tab = 'entity' | 'linked' | 'map' | 'gear';

export default function EntityPanel() {
  const { selectedEntityId, entityPanelOpen } = useUIStore();
  const [activeTab, setActiveTab] = useState<Tab>('entity');

  if (!entityPanelOpen || !selectedEntityId) return null;

  return (
    <div className="w-[280px] flex-shrink-0 border-l border-border bg-panel-bg overflow-y-auto">
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="p-4">
        {activeTab === 'entity' && <EntityTab id={selectedEntityId} />}
        {activeTab === 'linked' && <LinkedTab id={selectedEntityId} />}
        {activeTab === 'map' && <MapTab id={selectedEntityId} />}
        {activeTab === 'gear' && <GearTab />}
      </div>
    </div>
  );
}

function TabBar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'entity', label: 'Entity', icon: '👤' },
    { key: 'linked', label: 'Linked', icon: '🔗' },
    { key: 'map', label: 'Map', icon: '🗺' },
    { key: 'gear', label: 'Gear', icon: '⚙' },
  ];

  return (
    <div className="flex border-b border-border-light">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`
            flex-1 flex items-center justify-center gap-1 py-2.5 text-[11.5px] font-medium transition-all cursor-pointer
            ${activeTab === tab.key
              ? 'text-coral border-b-2 border-coral'
              : 'text-ink-muted hover:text-ink'
            }
          `}
        >
          <span className="text-[11px]">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function EntityTab({ id }: { id: string }) {
  const { data: entity, isLoading } = useEntity(id);
  const { data: topics } = useEntityTopics(id);

  if (isLoading || !entity) {
    return <p className="text-sm text-ink-muted">Loading...</p>;
  }

  return (
    <div className="space-y-5">
      {/* Avatar + name */}
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-coral/10 border-2 border-coral/30 flex items-center justify-center text-coral text-lg font-serif font-semibold">
          {entity.avatar_initials}
        </div>
        <h3 className="mt-2 font-serif font-semibold text-[16px] text-ink">{entity.name}</h3>
        {entity.role && <p className="text-[12px] text-ink-muted">{entity.role}</p>}
        <span className="mt-1 text-[10px] font-medium text-ink-ghost uppercase tracking-wide">
          {entity.entity_type}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Mentions" value={entity.total_mentions} />
        <StatCard label="Sessions" value={entity.session_count} />
        <StatCard label="Concepts" value={entity.concept_count} />
      </div>

      {/* Topics */}
      {topics && topics.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-2">
            Top Concepts
          </h4>
          <div className="space-y-1.5">
            {topics.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="text-[12px] text-ink-mid flex-1 truncate">{t.name}</span>
                <div className="w-16 h-1.5 rounded-full bg-sand overflow-hidden">
                  <div
                    className="h-full bg-sage rounded-full"
                    style={{ width: `${Math.min(100, (t.note_count / Math.max(1, topics[0].note_count)) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-ink-ghost w-4 text-right">{t.note_count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-border-light p-2 text-center">
      <div className="text-[16px] font-semibold text-ink font-mono">{value}</div>
      <div className="text-[9.5px] text-ink-muted uppercase tracking-wide">{label}</div>
    </div>
  );
}

function LinkedTab({ id }: { id: string }) {
  const { data: notes, isLoading } = useEntityNotes(id);
  const setActiveNoteId = useEditorStore((s) => s.setActiveNoteId);

  if (isLoading) return <p className="text-sm text-ink-muted">Loading...</p>;
  if (!notes?.length) return <p className="text-sm text-ink-muted">No linked notes</p>;

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-2">
        Connected Notes ({notes.length})
      </h4>
      {notes.map((note: NoteSummary) => (
        <button
          key={note.id}
          onClick={() => setActiveNoteId(note.id)}
          className="w-full text-left p-2.5 rounded-lg bg-white border border-border-light hover:border-coral/30 hover:bg-glow-coral transition-all cursor-pointer"
        >
          <p className="text-[12.5px] font-serif font-medium text-ink line-clamp-1">
            {note.title}
          </p>
          <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-1">{note.body_text}</p>
        </button>
      ))}
    </div>
  );
}

function MapTab({ id }: { id: string }) {
  const { data: entity } = useEntity(id);
  return (
    <div className="space-y-3">
      <h4 className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide">
        Location Map
      </h4>
      <MiniMap entity={entity} />
      <p className="text-[10px] text-ink-ghost text-center">
        Showing locations linked to this entity
      </p>
    </div>
  );
}

function GearTab() {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm">
      <span className="text-2xl mb-2">⚙</span>
      Settings coming soon
    </div>
  );
}
