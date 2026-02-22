import type { Note } from '../../types';

interface NoteMetaBarProps {
  note: Note;
}

export default function NoteMetaBar({ note }: NoteMetaBarProps) {
  const chips: Array<{ icon: string; label: string; style: string }> = [];

  if (note.location_name) {
    const loc = note.gps_coords
      ? `${note.location_name} · ${note.gps_coords}`
      : note.location_name;
    chips.push({ icon: '📍', label: loc, style: 'meta' });
  }

  if (note.weather) {
    chips.push({ icon: '🌤', label: note.weather, style: 'meta' });
  }

  if (note.time_start) {
    const start = new Date(note.time_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = note.time_end
      ? new Date(note.time_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null;
    const date = new Date(note.time_start).toLocaleDateString();
    const label = end ? `${start}–${end} · ${date}` : `${start} · ${date}`;
    chips.push({ icon: '🕐', label, style: 'meta' });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 border-b border-border-light">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-[11.5px] rounded-full
            bg-parchment border border-border-light text-ink-muted
            hover:border-coral hover:text-coral transition-all cursor-default"
        >
          <span className="text-[11px]">{chip.icon}</span>
          {chip.label}
        </span>
      ))}
    </div>
  );
}
