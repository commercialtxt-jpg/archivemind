import { useState } from 'react';
import NoteTypeBadge from './NoteTypeBadge';
import HighlightText from '../ui/HighlightText';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';
import { useToggleStar, useDeleteNote, useRestoreNote, usePermanentDeleteNote } from '../../hooks/useNotes';
import type { NoteSummary } from '../../types';

interface NoteCardProps {
  note: NoteSummary;
  isActive: boolean;
  onClick: () => void;
  isTrashView?: boolean;
}

export default function NoteCard({ note, isActive, onClick, isTrashView }: NoteCardProps) {
  const searchQuery = useUIStore((s) => s.searchQuery);
  const activeNoteId = useEditorStore((s) => s.activeNoteId);
  const setActiveNoteId = useEditorStore((s) => s.setActiveNoteId);
  const toggleStar = useToggleStar();
  const deleteNote = useDeleteNote();
  const restoreNote = useRestoreNote();
  const permanentDelete = usePermanentDeleteNote();
  const [starBouncing, setStarBouncing] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStarBouncing(true);
    toggleStar.mutate(note.id);
    setTimeout(() => setStarBouncing(false), 350);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNote.mutate(note.id);
    // Clear editor if this was the active note
    if (activeNoteId === note.id) {
      setActiveNoteId(null);
    }
  };

  return (
    // Using div+role to allow nested interactive elements (star button)
    // while keeping full keyboard + accessibility support.
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        relative w-full text-left p-3 rounded-[10px] mb-1 border-[1.5px] cursor-pointer note-card-lift
        ${isActive
          ? 'bg-card-bg border-border shadow-card-active'
          : 'bg-transparent border-transparent hover:bg-white/70'
        }
      `}
    >
      {/* Title + badge row */}
      <div className="flex items-start gap-1.5 mb-1">
        <h3 className="flex-1 font-serif text-[13.5px] font-medium leading-[1.3] text-ink line-clamp-2 min-w-0">
          <HighlightText text={note.title || 'Untitled'} query={searchQuery} />
        </h3>
        {/* Delete — minimal icon, visible on hover */}
        {!isTrashView && hovered && (
          <button
            onClick={handleDeleteClick}
            disabled={deleteNote.isPending}
            className="w-5 h-5 flex-shrink-0 flex items-center justify-center
              rounded text-ink-ghost/60 hover:text-coral hover:bg-coral/10
              transition-all cursor-pointer z-10 disabled:opacity-50"
            title="Move to trash"
            aria-label="Delete note"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 0 1 1.34-1.34h2.66a1.33 1.33 0 0 1 1.34 1.34V4M6.67 7.33v4M9.33 7.33v4" />
              <path d="M3.33 4h9.34l-.67 9.33a1.33 1.33 0 0 1-1.33 1.34H5.33A1.33 1.33 0 0 1 4 13.33L3.33 4Z" />
            </svg>
          </button>
        )}
        <button
          onClick={handleStarClick}
          className={`text-[13px] flex-shrink-0 cursor-pointer transition-colors ${
            note.is_starred ? 'text-amber' : 'text-ink-ghost hover:text-amber/60'
          } ${starBouncing ? 'animate-star-bounce' : ''}`}
          title={note.is_starred ? 'Unstar' : 'Star'}
          aria-label={note.is_starred ? 'Remove from starred' : 'Add to starred'}
          aria-pressed={note.is_starred}
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
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
