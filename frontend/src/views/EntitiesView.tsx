import { useState } from 'react';
import { useEntities } from '../hooks/useEntities';
import { useUIStore } from '../stores/uiStore';
import { useNavigate } from 'react-router-dom';
import type { EntityType, EntityWithStats } from '../types';

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
  const entities = (data?.data ?? []) as EntityWithStats[];
  const setSelectedEntityId = useUIStore((s) => s.setSelectedEntityId);
  const setActiveView = useUIStore((s) => s.setActiveView);
  const navigate = useNavigate();

  const handleEntityClick = (id: string) => {
    setSelectedEntityId(id);
    setActiveView('journal');
    navigate('/');
  };

  return (
    <div className="h-full overflow-y-auto bg-cream">
      <div className="max-w-[960px] mx-auto px-8 py-8">
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
              onClick={() => handleEntityClick(entity.id)}
            />
          ))}
        </div>

        {entities.length === 0 && (
          <div className="text-center py-16 text-ink-muted text-sm">
            No entities found.
          </div>
        )}
      </div>
    </div>
  );
}

function EntityCard({ entity, onClick }: { entity: EntityWithStats; onClick: () => void }) {
  const badge = TYPE_BADGES[entity.entity_type];
  const gradient = AVATAR_GRADIENTS[entity.entity_type];

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl bg-card-bg border border-border hover:border-sand-dark
        hover:shadow-card-active transition-all cursor-pointer group"
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
            <h3 className="font-serif text-[14px] font-medium text-ink truncate group-hover:text-coral transition-colors">
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

          {/* Stats */}
          <div className="flex items-center gap-3 text-[11px] text-ink-muted">
            <span>{entity.total_mentions} mentions</span>
            <span>{entity.session_count} sessions</span>
            <span>{entity.concept_count} concepts</span>
          </div>
        </div>
      </div>
    </button>
  );
}
