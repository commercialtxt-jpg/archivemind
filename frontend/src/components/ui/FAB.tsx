import { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';

interface FABProps {
  onNewNote: () => void;
  isCreating?: boolean;
}

export default function FAB({ onNewNote, isCreating }: FABProps) {
  const activeNoteId = useEditorStore((s) => s.activeNoteId);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleRecord = () => {
    if (!activeNoteId) {
      showToast('Select or create a note first');
      return;
    }
    // Dispatch a custom event that EditorToolbar listens to
    window.dispatchEvent(new CustomEvent('archivemind:start-recording'));
  };

  return (
    <div className="fixed bottom-7 right-[320px] flex items-center gap-2 z-30 animate-slide-up">
      {/* Toast */}
      {toast && (
        <div
          className="absolute bottom-full mb-2 right-0 bg-ink text-cream text-[11px] px-3 py-1.5
            rounded-md shadow-card-active whitespace-nowrap animate-fade-in"
        >
          {toast}
        </div>
      )}

      <button
        onClick={handleRecord}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-3xl
          bg-warm-white border border-border text-ink-mid text-[13px] font-medium
          shadow-fab hover:shadow-fab-hover hover:-translate-y-0.5
          transition-all cursor-pointer"
        title={activeNoteId ? 'Start voice recording' : 'Select a note first'}
      >
        <span className="text-[14px]">🎙</span>
        Record
      </button>
      <button
        onClick={onNewNote}
        disabled={isCreating}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-3xl
          bg-coral text-white text-[13px] font-semibold
          shadow-fab hover:shadow-fab-hover hover:-translate-y-0.5
          transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        title="Create new note"
      >
        <span className="text-[14px]">✏️</span>
        New Note
      </button>
    </div>
  );
}
