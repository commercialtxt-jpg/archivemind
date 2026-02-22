import type { InventoryItem } from '../../types';

interface InventoryCardProps {
  item: InventoryItem;
  onStatusChange?: (id: string, status: string) => void;
}

const statusStyles: Record<string, string> = {
  charged: 'bg-sage/10 text-sage border-sage/25',
  ready: 'bg-sage/10 text-sage border-sage/25',
  packed: 'bg-sage/10 text-sage border-sage/25',
  low: 'bg-amber/10 text-amber border-amber/25',
  missing: 'bg-coral/10 text-coral border-coral/25',
};

export default function InventoryCard({ item, onStatusChange }: InventoryCardProps) {
  const style = statusStyles[item.status] || statusStyles.packed;

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border-light hover:shadow-card transition-all">
      {/* Icon */}
      <span className="text-xl flex-shrink-0">{item.icon}</span>

      {/* Name */}
      <span className="flex-1 text-[13px] text-ink font-medium truncate">
        {item.name}
      </span>

      {/* Status badge */}
      <button
        onClick={() => onStatusChange?.(item.id, item.status)}
        className={`
          text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border
          cursor-pointer transition-all hover:opacity-80
          ${style}
        `}
      >
        {item.status}
      </button>
    </div>
  );
}
