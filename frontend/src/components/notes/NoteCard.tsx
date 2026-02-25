import NoteTypeBadge from './NoteTypeBadge';
import HighlightText from '../ui/HighlightText';
import { useUIStore } from '../../stores/uiStore';
import { useToggleStar, useRestoreNote, usePermanentDeleteNote } from '../../hooks/useNotes';
import type { NoteSummary } from '../../types';

interface NoteCardProps {
  note: NoteSummary;
  isActive: boolean;
  onClick: () => void;
  isTrashView?: boolean;
}

export default function NoteCard({ note, isActive, onClick, isTrashView }: NoteCardProps) {
  const searchQuery = useUIStore((s) => s.searchQuery);
  const toggleStar = useToggleStar();
  const restoreNote = useRestoreNote();
  const permanentDelete = usePermanentDeleteNote();

  return (
    // Using div+role to allow nested interactive elements (star button)
    // while keeping full keyboard + accessibility support.
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className={`
        w-full text-left p-3 rounded-[10px] mb-1 border-[1.5px] transition-all duration-150 cursor-pointer
        ${isActive
          ? 'bg-card-bg border-border shadow-card-active'
          : 'bg-transparent border-transparent hover:bg-white/70'
        }
      `}
    >
      {/* Title + badge row */}
      <div className="flex items-start gap-2 mb-1">
        <h3 className="flex-1 font-serif text-[13.5px] font-medium leading-[1.3] text-ink line-clamp-2">
          <HighlightText text={note.title || 'Untitled'} query={searchQuery} />
        </h3>
        <button
          onClick={(e) => { e.stopPropagation(); toggleStar.mutate(note.id); }}
          className={`text-[13px] flex-shrink-0 transition-colors cursor-pointer ${
            note.is_starred ? 'text-amber' : 'text-ink-ghost hover:text-amber/60'
          }`}
          title={note.is_starred ? 'Unstar' : 'Star'}
        >
          {note.is_starred ? '★' : '☆'}
        </button>
        <NoteTypeBadge type={note.note_type} />
      </div>

      {/* Excerpt */}
      {note.body_text && (
        <p className="text-[12px] leading-[1.5] text-ink-muted line-clamp-2 mb-2">
          <HighlightText text={note.body_text} query={searchQuery} />
        </p>
      )}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5 mb-1.5">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-sand text-ink-soft leading-none"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-3 text-[11px] text-ink-muted">
        {note.location_name && (
          <span className="flex items-center gap-1 truncate">
            <span className="text-[10px]">📍</span>
            {note.location_name}
          </span>
        )}
        {note.duration_seconds && (
          <span className="flex items-center gap-1">
            <span className="text-[10px]">🔊</span>
            {formatDuration(note.duration_seconds)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="text-[10px]">🕐</span>
          {formatRelativeTime(note.created_at)}
        </span>
      </div>

      {/* Trash actions */}
      {isTrashView && (
        <div className="flex gap-2 mt-2 pt-2 border-t border-border-light">
          <button
            onClick={(e) => { e.stopPropagation(); restoreNote.mutate(note.id); }}
            disabled={restoreNote.isPending}
            className="text-[11px] text-sage hover:text-sage/80 cursor-pointer font-medium disabled:opacity-50 transition-colors"
          >
            ↩ Restore
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); permanentDelete.mutate(note.id); }}
            disabled={permanentDelete.isPending}
            className="text-[11px] text-coral hover:text-coral-light cursor-pointer font-medium disabled:opacity-50 transition-colors"
          >
            ✕ Delete Forever
          </button>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
