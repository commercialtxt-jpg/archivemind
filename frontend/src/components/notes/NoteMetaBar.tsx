import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useNoteEntities } from '../../hooks/useEntities';
import type { Note } from '../../types';

// Parse "lat,lng" GPS coords string into a number pair, or null if invalid.
function parseGpsCoords(gps: string | null | undefined): { lat: number; lng: number } | null {
  if (!gps) return null;
  const parts = gps.split(',');
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

interface NoteMetaBarProps {
  note: Note;
}

export default function NoteMetaBar({ note }: NoteMetaBarProps) {
  const navigate = useNavigate();
  const setSelectedEntityId = useUIStore((s) => s.setSelectedEntityId);
  const setMapFlyTo = useUIStore((s) => s.setMapFlyTo);
  const { data: noteEntities } = useNoteEntities(note.id);

  const handleEntityClick = (entityId: string) => {
    // setSelectedEntityId also opens the entity panel (see uiStore)
    setSelectedEntityId(entityId);
  };

  const chips: Array<{
    icon: string;
    label: string;
    variant: 'meta' | 'ai';
    isLocation?: boolean;
  }> = [];

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

  const hasContent = (noteEntities && noteEntities.length > 0) || chips.length > 0;
  if (!hasContent) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 border-b border-border-light">
      {/* Entity chips — one per linked entity */}
      {noteEntities?.map((entity) => {
        const initials = entity.avatar_initials || entity.name.slice(0, 2).toUpperCase();
        return (
          <button
            key={entity.id}
            onClick={() => handleEntityClick(entity.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11.5px] rounded-full
              bg-coral text-white font-medium cursor-pointer hover:bg-coral/90 transition-colors"
            title="View entity details"
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-semibold leading-none">
              {initials}
            </span>
            {entity.name}
          </button>
        );
      })}

      {chips.map((chip, i) => {
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
              onClick={() => {
                // Store the note's GPS coordinates so FullMap can fly to them.
                const coords = parseGpsCoords(note.gps_coords);
                if (coords) {
                  setMapFlyTo({ ...coords, label: note.location_name ?? undefined });
                }
                navigate('/map');
              }}
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
              bg-parchment border border-border-light text-ink-muted cursor-default"
          >
            <span className="text-[11px]">{chip.icon}</span>
            {chip.label}
          </span>
        );
      })}
    </div>
  );
}
