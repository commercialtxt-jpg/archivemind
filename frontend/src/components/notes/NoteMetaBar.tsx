import { useUIStore } from '../../stores/uiStore';
import { useEntity } from '../../hooks/useEntities';
import type { Note } from '../../types';

interface NoteMetaBarProps {
  note: Note;
}

export default function NoteMetaBar({ note }: NoteMetaBarProps) {
  const selectedEntityId = useUIStore((s) => s.selectedEntityId);
  const setSelectedEntityId = useUIStore((s) => s.setSelectedEntityId);
  const setActiveView = useUIStore((s) => s.setActiveView);
  const { data: entity } = useEntity(selectedEntityId);

  const chips: Array<{
    icon: string;
    label: string;
    variant: 'meta' | 'entity' | 'ai';
    entityId?: string;
    isLocation?: boolean;
  }> = [];

  // Entity chip (coral) — clickable to open entity in panel
  if (entity) {
    chips.push({
      icon: entity.avatar_initials,
      label: entity.name,
      variant: 'entity',
      entityId: entity.id,
    });
  }

  if (note.location_name) {
    const loc = note.gps_coords
      ? `${note.location_name} · ${note.gps_coords}`
      : note.location_name;
    chips.push({ icon: '📍', label: loc, variant: 'meta', isLocation: true });
  }

  if (note.weather) {
    chips.push({ icon: '🌤', label: note.weather, variant: 'meta' });
  }

  if (note.time_start) {
    const start = new Date(note.time_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = note.time_end
      ? new Date(note.time_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;
    const date = new Date(note.time_start).toLocaleDateString();
    const label = end ? `${start}–${end} · ${date}` : `${start} · ${date}`;
    chips.push({ icon: '🕐', label, variant: 'meta' });
  }

  // AI Transcribed badge for voice memos
  if (note.note_type === 'voice_memo') {
    chips.push({ icon: '✓', label: 'AI Transcribed', variant: 'ai' });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 border-b border-border-light">
      {chips.map((chip, i) => {
        if (chip.variant === 'entity') {
          return (
            <button
              key={i}
              onClick={() => {
                if (chip.entityId) setSelectedEntityId(chip.entityId);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-[11.5px] rounded-full
                bg-coral text-white font-medium cursor-pointer hover:bg-coral/90 transition-colors"
              title="View entity details"
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-semibold">
                {chip.icon}
              </span>
              {chip.label}
            </button>
          );
        }

        if (chip.variant === 'ai') {
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-3 py-1 text-[11.5px] rounded-full
                bg-sage/15 text-sage font-medium cursor-default"
            >
              <span className="text-[10px]">{chip.icon}</span>
              {chip.label}
            </span>
          );
        }

        // Meta chip — location is clickable to map view
        if (chip.isLocation) {
          return (
            <button
              key={i}
              onClick={() => setActiveView('map')}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-[11.5px] rounded-full
                bg-parchment border border-border-light text-ink-muted
                hover:border-coral hover:text-coral transition-all cursor-pointer"
              title="View on map"
            >
              <span className="text-[11px]">{chip.icon}</span>
              {chip.label}
            </button>
          );
        }

        return (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11.5px] rounded-full
              bg-parchment border border-border-light text-ink-muted
              hover:border-coral hover:text-coral transition-all cursor-default"
          >
            <span className="text-[11px]">{chip.icon}</span>
            {chip.label}
          </span>
        );
      })}
    </div>
  );
}
