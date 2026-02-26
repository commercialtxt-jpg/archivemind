import EntityPanel from './EntityPanel';

interface MobileEntitySheetProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileEntitySheet({ open, onClose }: MobileEntitySheetProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Entity context panel"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/40" aria-hidden="true" />

      {/* Bottom sheet panel */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-warm-white rounded-t-2xl max-h-[70vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-sand-dark" />
        </div>
        <EntityPanel />
      </div>
    </div>
  );
}
