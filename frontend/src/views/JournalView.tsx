import { useState } from 'react';
import NoteList from '../components/notes/NoteList';
import NoteEditor from '../components/notes/NoteEditor';
import EntityPanel from '../components/entity/EntityPanel';
import FAB from '../components/ui/FAB';
import QuickCaptureModal from '../components/ui/QuickCaptureModal';
import { useCreateNote } from '../hooks/useNotes';
import { useEditorStore } from '../stores/editorStore';
import { useUIStore } from '../stores/uiStore';
import { useIsMobile } from '../hooks/useMediaQuery';

export default function JournalView() {
  const createNote = useCreateNote();
  const setActiveNoteId = useEditorStore((s) => s.setActiveNoteId);
  const { mobileShowEditor, setMobileShowEditor } = useUIStore();
  const isMobile = useIsMobile();
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

  const handleNewNote = () => {
    createNote.mutate(
      { title: 'Untitled', note_type: 'field_note' } as never,
      {
        onSuccess: (note) => {
          if (note?.id) {
            setActiveNoteId(note.id);
            if (isMobile) setMobileShowEditor(true);
          }
        },
      }
    );
  };

  // Mobile layout: show NoteList OR NoteEditor, never both
  if (isMobile) {
    return (
      <div className="flex flex-col h-full relative view-enter">
        {!mobileShowEditor ? (
          <NoteList onNoteSelect={() => setMobileShowEditor(true)} />
        ) : (
          <div className="flex flex-col h-full">
            <button
              onClick={() => setMobileShowEditor(false)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] text-ink-muted hover:text-ink
                border-b border-border-light bg-panel-bg shrink-0 cursor-pointer transition-colors"
              aria-label="Back to notes list"
            >
              <span aria-hidden="true">&#8592;</span> Back to notes
            </button>
            <div className="flex-1 min-h-0">
              <NoteEditor />
            </div>
          </div>
        )}
        <FAB
          onNewNote={handleNewNote}
          isCreating={createNote.isPending}
          onQuickCapture={() => setQuickCaptureOpen(true)}
        />
        <QuickCaptureModal
          open={quickCaptureOpen}
          onClose={() => setQuickCaptureOpen(false)}
          onCaptured={(noteId) => {
            setQuickCaptureOpen(false);
            setActiveNoteId(noteId);
            setMobileShowEditor(true);
          }}
        />
      </div>
    );
  }

  // Desktop layout: NoteList + NoteEditor + EntityPanel side by side
  return (
    <div className="flex h-full relative view-enter">
      <NoteList />
      <div className="flex-1 min-w-0">
        <NoteEditor />
      </div>
      <EntityPanel />
      <FAB
        onNewNote={handleNewNote}
        isCreating={createNote.isPending}
        onQuickCapture={() => setQuickCaptureOpen(true)}
      />
      <QuickCaptureModal
        open={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        onCaptured={(noteId) => {
          setQuickCaptureOpen(false);
          setActiveNoteId(noteId);
        }}
      />
    </div>
  );
}
