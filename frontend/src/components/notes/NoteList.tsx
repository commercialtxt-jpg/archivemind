import { useEffect, useMemo, useRef, useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';
import { useNotes, useCreateNote, usePermanentDeleteNote } from '../../hooks/useNotes';
import { useSearch } from '../../hooks/useSearch';
import NoteCard from './NoteCard';

export default function NoteList() {
  const { sidebarFilter, searchQuery } = useUIStore();
  const { activeNoteId, setActiveNoteId } = useEditorStore();
  const createNote = useCreateNote();
  const permanentDelete = usePermanentDeleteNote();
  const isTrashView = sidebarFilter.type === 'trash';

  const [menuOpen, setMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'type'>('newest');
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuButtonRef.current && menuButtonRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  const filters = useMemo(() => {
    const f: Record<string, string | boolean> = {};
    switch (sidebarFilter.type) {
      case 'starred':
        f.starred = true;
        break;
      case 'trash':
        f.deleted = true;
        break;
      case 'field_trip':
        if (sidebarFilter.id) f.field_trip_id = sidebarFilter.id;
        break;
      case 'concept':
        if (sidebarFilter.id) f.concept_id = sidebarFilter.id;
        break;
      case 'entity_type':
        if (sidebarFilter.id) f.entity_id = sidebarFilter.id;
        break;
      case 'note_type':
        if (sidebarFilter.id) f.note_type = sidebarFilter.id;
        break;
    }

    // Sorting
    if (sortBy === 'newest') { f.sort = 'created_at'; f.order = 'desc'; }
    else if (sortBy === 'oldest') { f.sort = 'created_at'; f.order = 'asc'; }
    else if (sortBy === 'type') { f.sort = 'note_type'; f.order = 'asc'; }

    return f;
  }, [sidebarFilter, sortBy]);

  const isSearching = searchQuery.length >= 2;
  const { data, isLoading } = useNotes(isSearching ? {} : filters);
  const { data: searchResults, isLoading: searchLoading } = useSearch(searchQuery);

  // Use search results when searching, otherwise normal notes
  const notes = useMemo(() => {
    if (isSearching && searchResults) {
      return searchResults.notes.map((n) => ({
        id: n.id,
        workspace_id: '',
        title: n.title,
        body_text: n.excerpt,
        note_type: n.note_type,
        is_starred: false,
        location_name: null,
        gps_coords: null,
        weather: null,
        created_at: '',
        updated_at: '',
      }));
    }
    return data?.data || [];
  }, [isSearching, searchResults, data]);

  const loading = isSearching ? searchLoading : isLoading;

  const title = useMemo(() => {
    if (isSearching) return 'Search Results';
    switch (sidebarFilter.type) {
      case 'starred': return 'Starred';
      case 'trash': return 'Trash';
      case 'field_trip':
      case 'concept':
      case 'entity_type':
      case 'note_type':
        return sidebarFilter.label || 'Filtered';
      default: return 'All Notes';
    }
  }, [sidebarFilter, isSearching]);

  const handleNewNote = async () => {
    const note = await createNote.mutateAsync({ title: 'Untitled Note' } as never);
    setActiveNoteId(note.id);
  };

  const handleEmptyTrash = () => {
    for (const note of notes) {
      permanentDelete.mutate(note.id);
    }
  };

  return (
    <div className="flex flex-col w-[260px] shrink-0 bg-panel-bg border-r border-border-light">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
        <h2 className="font-serif text-[15px] font-semibold text-ink">{title}</h2>
        <div className="flex items-center gap-1">
          {isTrashView && notes.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              disabled={permanentDelete.isPending}
              className="text-[11px] text-coral hover:text-coral-light cursor-pointer font-medium mr-1 disabled:opacity-50 transition-colors"
              title="Permanently delete all trashed notes"
            >
              Empty Trash
            </button>
          )}
          {!isTrashView && (
            <>
              <div className="relative">
                <button
                  ref={menuButtonRef}
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center justify-center w-7 h-7 rounded-md text-ink-muted hover:bg-sand hover:text-ink transition-all cursor-pointer"
                  title="More options"
                >
                  ⋮
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg border border-border-light shadow-card-active z-20 py-1 animate-fade-in">
                    {(['newest', 'oldest', 'type'] as const).map((option) => {
                      const labels = { newest: 'Newest first', oldest: 'Oldest first', type: 'By type' };
                      const active = sortBy === option;
                      return (
                        <button
                          key={option}
                          onClick={() => { setSortBy(option); setMenuOpen(false); }}
                          className={`w-full text-left px-3 py-1.5 text-[12px] cursor-pointer transition-colors
                            ${active ? 'text-coral font-medium bg-glow-coral' : 'text-ink-muted hover:bg-parchment'}`}
                        >
                          {labels[option]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                onClick={handleNewNote}
                disabled={createNote.isPending}
                className="flex items-center justify-center w-7 h-7 rounded-md bg-coral text-white shadow-coral-btn
                  hover:bg-coral-light transition-all cursor-pointer disabled:opacity-50"
                title="New note"
              >
                +
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search indicator */}
      {isSearching && (
        <div className="px-4 py-2 text-[11px] text-ink-muted border-b border-border-light">
          Searching: &ldquo;{searchQuery}&rdquo;
          {searchResults && (
            <span className="ml-1 text-ink-ghost">
              ({searchResults.notes.length} notes, {searchResults.entities.length} entities, {searchResults.concepts.length} concepts)
            </span>
          )}
        </div>
      )}

      {/* Note list */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="p-4 text-center text-[12px] text-ink-muted">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-center text-[12px] text-ink-muted">
            {isSearching ? 'No results found' : sidebarFilter.type === 'trash' ? 'Trash is empty' : 'No notes yet'}
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isActive={note.id === activeNoteId}
              onClick={() => setActiveNoteId(note.id)}
              isTrashView={isTrashView}
            />
          ))
        )}
      </div>
    </div>
  );
}
