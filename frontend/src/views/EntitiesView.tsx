import { useState } from 'react';
import { useEntities, useEntity, useEntityTopics, useEntityNotes } from '../hooks/useEntities';
import { useUIStore } from '../stores/uiStore';
import type { Entity, EntityType, EntityWithStats } from '../types';

type FilterTab = 'all' | 'person' | 'location' | 'artifact';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'person', label: 'Interviewees' },
  { key: 'location', label: 'Locations' },
  { key: 'artifact', label: 'Artifacts' },
];

const AVATAR_GRADIENTS: Record<EntityType, string> = {
  person: 'from-coral to-coral-light',
  location: 'from-amber to-amber-light',
  artifact: 'from-sage to-sage-light',
};

const TYPE_BADGES: Record<EntityType, { label: string; bg: string; text: string }> = {
  person: { label: 'Person', bg: 'bg-glow-coral', text: 'text-coral' },
  location: { label: 'Location', bg: 'bg-glow-amber', text: 'text-amber' },
  artifact: { label: 'Artifact', bg: 'bg-[rgba(107,140,122,0.12)]', text: 'text-sage' },
};

export default function EntitiesView() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const typeFilter = activeTab === 'all' ? undefined : activeTab;
  const { data } = useEntities(typeFilter);
  const entities: Entity[] = data?.data ?? [];

  const selectedEntityId = useUIStore((s) => s.selectedEntityId);
  const setSelectedEntityId = useUIStore((s) => s.setSelectedEntityId);

  // Selecting an entity stays within this view — no navigation
  const handleEntityClick = (id: string) => {
    setSelectedEntityId(id);
  };

  const handleClearSelection = () => {
    setSelectedEntityId(null);
  };

  return (
    <div className="flex h-full overflow-hidden bg-cream view-enter">
      {/* Left panel: header + filter tabs + entity grid */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-[960px] mx-auto p-4 md:px-8 md:py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-serif text-[24px] font-semibold text-ink mb-1">Entities</h1>
            <p className="text-[13px] text-ink-muted">
              {entities.length} {activeTab === 'all' ? 'total' : activeTab + 's'} in this workspace
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 mb-6 bg-parchment border border-border rounded-lg p-[3px] w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  px-3.5 py-1.5 text-[12.5px] rounded-md transition-all cursor-pointer
                  ${activeTab === tab.key
                    ? 'bg-white text-ink font-semibold shadow-tab-active'
                    : 'text-ink-muted hover:bg-white/70 hover:text-ink font-medium'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {entities.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                isSelected={selectedEntityId === entity.id}
                onClick={() => handleEntityClick(entity.id)}
              />
            ))}
          </div>

          {entities.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                style={{ background: 'rgba(196,132,74,0.10)', border: '1px solid rgba(196,132,74,0.2)' }}
              >
                👤
              </div>
              <div className="text-center max-w-[320px]">
                <p className="font-serif text-[16px] font-semibold text-ink mb-1.5">
                  {activeTab === 'all' ? 'No entities yet' : `No ${activeTab}s yet`}
                </p>
                <p className="text-[12.5px] text-ink-muted leading-relaxed">
                  Entities appear here when you mention people, locations, or artifacts in your field notes using the @ mention syntax.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel: entity detail — only visible when an entity is selected */}
      {selectedEntityId && (
        <EntityDetailPanel
          entityId={selectedEntityId}
          onClose={handleClearSelection}
        />
      )}
    </div>
  );
}

function EntityCard({
  entity,
  isSelected,
  onClick,
}: {
  entity: Entity;
  isSelected: boolean;
  onClick: () => void;
}) {
  const badge = TYPE_BADGES[entity.entity_type];
  const gradient = AVATAR_GRADIENTS[entity.entity_type];

  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      className={`
        w-full text-left p-4 rounded-xl border transition-all cursor-pointer group
        ${isSelected
          ? 'bg-white border-coral/40 shadow-card-active'
          : 'bg-card-bg border-border hover:border-sand-dark hover:shadow-card-active'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${gradient}
            flex items-center justify-center text-white text-[13px] font-semibold`}
        >
          {entity.avatar_initials}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + badge */}
          <div className="flex items-center gap-2 mb-0.5">
            <h3
              className={`font-serif text-[14px] font-medium truncate transition-colors
                ${isSelected ? 'text-coral' : 'text-ink group-hover:text-coral'}`}
            >
              {entity.name}
            </h3>
            <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          </div>

          {/* Role */}
          {entity.role && (
            <p className="text-[11.5px] text-ink-muted truncate mb-2">{entity.role}</p>
          )}

          {/* Stats — populated from EntityWithStats when available (detail endpoint only) */}
          {'total_mentions' in entity && (
            <div className="flex items-center gap-3 text-[11px] text-ink-muted">
              <span>{(entity as EntityWithStats).total_mentions} mentions</span>
              <span>{(entity as EntityWithStats).session_count} sessions</span>
              <span>{(entity as EntityWithStats).concept_count} concepts</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// EntityDetailPanel — inline detail panel shown on the right when an entity
// is selected. Keeps the user on /entities without any navigation.
// ---------------------------------------------------------------------------

function EntityDetailPanel({ entityId, onClose }: { entityId: string; onClose: () => void }) {
  const { data: entity, isLoading: entityLoading } = useEntity(entityId);
  const { data: topics, isLoading: topicsLoading } = useEntityTopics(entityId);
  const { data: entityNotes } = useEntityNotes(entityId);

  return (
    <aside className="w-[300px] flex-shrink-0 border-l border-border bg-parchment flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light flex-shrink-0">
        <h2 className="font-serif text-[14px] font-semibold text-ink">Entity Details</h2>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-ink-muted hover:text-coral hover:bg-coral/10 rounded transition-colors text-[13px] cursor-pointer"
          title="Close detail panel"
          aria-label="Close entity detail panel"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {(entityLoading || topicsLoading) ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm">
            <div className="w-5 h-5 border-2 border-coral/30 border-t-coral rounded-full animate-spin mb-2" />
            Loading...
          </div>
        ) : !entity ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-ink-ghost text-sm px-4 text-center gap-2">
            <span className="text-2xl">🔍</span>
            <p>Entity not found.</p>
          </div>
        ) : (
          <div className="px-4 pb-6 space-y-4 pt-4">
            {/* Avatar + name + role */}
            <div className="bg-white p-4 rounded-xl border border-border-light shadow-[0_1px_3px_rgba(0,0,0,.04)] flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[15px] font-serif font-semibold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--color-coral), var(--color-amber))' }}
              >
                {entity.avatar_initials || entity.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-serif font-semibold text-[15px] text-ink leading-tight">{entity.name}</h3>
                {entity.role && (
                  <p className="text-[12px] text-ink-muted leading-tight mt-0.5">{entity.role}</p>
                )}
                <p className="text-[10.5px] text-ink-ghost mt-0.5 capitalize">{entity.entity_type}</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'MENTIONS', value: entity.total_mentions ?? 0 },
                { label: 'SESSIONS', value: entity.session_count ?? 0 },
                { label: 'CONCEPTS', value: entity.concept_count ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-lg border border-border-light p-2 text-center">
                  <div className="text-[17px] font-semibold text-ink font-mono leading-tight">{value}</div>
                  <div className="text-[9px] text-ink-muted uppercase tracking-wide mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Topics */}
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

            {/* Connected notes */}
            {entityNotes && entityNotes.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-ink-ghost uppercase tracking-widest mb-2">
                  Connected Notes ({entityNotes.length})
                </h4>
                <div className="space-y-2">
                  {entityNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg bg-white border border-border-light"
                    >
                      <p className="text-[12.5px] font-serif font-medium text-ink line-clamp-1 leading-tight">
                        {note.title || 'Untitled'}
                      </p>
                      {note.body_text && (
                        <p className="text-[11px] text-ink-ghost mt-1 line-clamp-2 leading-snug">
                          {note.body_text}
                        </p>
                      )}
                      <p className="text-[10px] text-ink-ghost mt-1.5 capitalize">
                        {note.note_type?.replace('_', ' ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entityNotes && entityNotes.length === 0 && (!topics || topics.length === 0) && (
              <p className="text-[11px] text-ink-ghost text-center py-6">
                No notes or topics linked to this entity yet.
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
