import EntityPanel from './EntityPanel';
import { useUIStore } from '../../stores/uiStore';
import { useEffect } from 'react';

interface MobileEntitySheetProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileEntitySheet({ open, onClose }: MobileEntitySheetProps) {
  // Ensure entity panel is "open" state so it renders content, not the collapsed bar
  const entityPanelOpen = useUIStore((s) => s.entityPanelOpen);
  const toggleEntityPanel = useUIStore((s) => s.toggleEntityPanel);

  useEffect(() => {
    if (open && !entityPanelOpen) {
      toggleEntityPanel();
    }
  }, [open, entityPanelOpen, toggleEntityPanel]);

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

      {/* Bottom sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-parchment rounded-t-2xl max-h-[80vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-sand-dark" />
        </div>

        {/* Entity panel content — override fixed width to fill sheet */}
        <div className="flex-1 min-h-0 overflow-y-auto mobile-entity-sheet">
          <EntityPanel />
        </div>
      </div>
    </div>
  );
}
