interface FABProps {
  onNewNote: () => void;
}

export default function FAB({ onNewNote }: FABProps) {
  return (
    <div className="fixed bottom-7 right-[320px] flex items-center gap-2 z-30 animate-slide-up">
      <button
        title="Coming soon"
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-3xl
          bg-warm-white border border-border text-ink-mid text-[13px] font-medium
          shadow-fab hover:shadow-fab-hover hover:-translate-y-0.5
          transition-all cursor-pointer"
      >
        <span className="text-[14px]">🎙</span>
        Record
      </button>
      <button
        onClick={onNewNote}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-3xl
          bg-coral text-white text-[13px] font-semibold
          shadow-fab hover:shadow-fab-hover hover:-translate-y-0.5
          transition-all cursor-pointer"
      >
        <span className="text-[14px]">✏️</span>
        New Note
      </button>
    </div>
  );
}
