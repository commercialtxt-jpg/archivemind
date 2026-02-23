import NoteList from '../components/notes/NoteList';
import NoteEditor from '../components/notes/NoteEditor';
import EntityPanel from '../components/entity/EntityPanel';
import FAB from '../components/ui/FAB';
import { useCreateNote } from '../hooks/useNotes';
import { useEditorStore } from '../stores/editorStore';

export default function JournalView() {
  const createNote = useCreateNote();
  const setActiveNoteId = useEditorStore((s) => s.setActiveNoteId);

  const handleNewNote = () => {
    createNote.mutate(
      { title: '', note_type: 'field_note' } as never,
      {
        onSuccess: (note) => {
          if (note?.id) setActiveNoteId(note.id);
        },
      }
    );
  };

  return (
    <div className="flex h-full relative">
      <NoteList />
      <div className="flex-1 min-w-0">
        <NoteEditor />
      </div>
      <EntityPanel />
      <FAB onNewNote={handleNewNote} />
    </div>
  );
}
