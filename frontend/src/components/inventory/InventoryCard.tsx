import type { InventoryItem } from '../../types';
import { STATUS_CONFIG, STATUS_CYCLE } from './inventoryConfig';

export { STATUS_CYCLE };

interface InventoryCardProps {
  item: InventoryItem;
  onStatusChange?: (id: string, status: string) => void;
  onEdit?: (item: InventoryItem) => void;
  onDelete?: (id: string) => void;
}

export default function InventoryCard({ item, onStatusChange, onEdit, onDelete }: InventoryCardProps) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.packed;

  return (
    <div className="bg-white rounded-xl border border-border-light hover:shadow-card transition-all group overflow-hidden">
      {/* Alert color top strip */}
      {(item.status === 'missing' || item.status === 'low') && (
        <div
          className="h-0.5 w-full"
          style={{
            background: item.status === 'missing'
              ? 'var(--color-coral)'
              : 'var(--color-amber)',
          }}
        />
      )}

      <div className="p-3.5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <span className="text-[22px] flex-shrink-0 leading-none mt-0.5">{item.icon}</span>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13.5px] font-semibold text-ink leading-tight truncate">
                {item.name}
              </span>
              {/* Status badge — clickable to cycle */}
              <button
                onClick={() => onStatusChange?.(item.id, item.status)}
                title="Click to cycle status"
                className={`
                  flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold uppercase
                  tracking-wide px-2 py-0.5 rounded-full border cursor-pointer
                  transition-all hover:opacity-75 active:scale-95
                  ${cfg.classes}
                `}
              >
                <span className="text-[9px]">{cfg.icon}</span>
                {cfg.label}
              </button>
            </div>

            {/* Notes (if present) */}
            {item.notes && (
              <p className="text-[11.5px] text-ink-muted line-clamp-1 leading-snug mb-1">
                {item.notes}
              </p>
            )}

            {/* Category + actions row */}
            <div className="flex items-center gap-2 mt-1">
              {item.category && item.category !== 'general' && (
                <span className="text-[10px] text-ink-ghost bg-sand px-1.5 py-0.5 rounded-full">
                  {item.category}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <button
                    onClick={() => onEdit(item)}
                    title="Edit item"
                    className="w-6 h-6 flex items-center justify-center text-[11px] text-ink-ghost hover:text-coral hover:bg-coral/8 rounded transition-colors cursor-pointer"
                  >
                    ✎
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(item.id)}
                    title="Delete item"
                    className="w-6 h-6 flex items-center justify-center text-[11px] text-ink-ghost hover:text-coral hover:bg-coral/8 rounded transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
