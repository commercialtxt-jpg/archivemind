import { useState } from 'react';
import NoteList from '../components/notes/NoteList';
import NoteEditor from '../components/notes/NoteEditor';
import EntityPanel from '../components/entity/EntityPanel';
import FAB from '../components/ui/FAB';
import QuickCaptureModal from '../components/ui/QuickCaptureModal';
import { useCreateNote } from '../hooks/useNotes';
import { useEditorStore } from '../stores/editorStore';

export default function JournalView() {
  const createNote = useCreateNote();
  const setActiveNoteId = useEditorStore((s) => s.setActiveNoteId);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

  const handleNewNote = () => {
    createNote.mutate(
      { title: 'Untitled', note_type: 'field_note' } as never,
      {
        onSuccess: (note) => {
          if (note?.id) setActiveNoteId(note.id);
        },
      }
    );
  };

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
