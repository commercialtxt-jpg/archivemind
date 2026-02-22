import { useEditorStore } from '../../stores/editorStore';
import { useCreateNote } from '../../hooks/useNotes';
import { useUIStore } from '../../stores/uiStore';

export default function FAB() {
  const createNote = useCreateNote();
  const setActiveNoteId = useEditorStore((s) => s.setActiveNoteId);
  const activeView = useUIStore((s) => s.activeView);

  // Only show on journal view
  if (activeView !== 'journal') return null;

  const handleNewNote = async () => {
    const note = await createNote.mutateAsync({ title: 'Untitled Note' } as never);
    setActiveNoteId(note.id);
  };

  const handleRecord = () => {
    // Future: open audio recording modal
  };

  return (
    <div className="fixed bottom-7 right-[320px] flex gap-2 z-10">
      <button
        onClick={handleRecord}
        className="flex items-center gap-[7px] px-[18px] py-[10px] rounded-3xl
          bg-warm-white text-ink border border-border
          font-sans text-[13px] font-medium
          shadow-fab hover:bg-parchment hover:-translate-y-px hover:shadow-fab-hover
          transition-all duration-200 cursor-pointer"
      >
        <span>🎙</span>
        Record
      </button>
      <button
        onClick={handleNewNote}
        disabled={createNote.isPending}
        className="flex items-center gap-[7px] px-[18px] py-[10px] rounded-3xl
          bg-coral text-white
          font-sans text-[13px] font-medium
          shadow-fab hover:bg-coral-light hover:-translate-y-px hover:shadow-fab-hover
          transition-all duration-200 cursor-pointer disabled:opacity-50"
      >
        <span>✏️</span>
        New Note
      </button>
    </div>
  );
}
