import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import type { EntityType } from '../../types';

export interface MentionItem {
  id: string;
  label: string;
  entity_type: EntityType;
  avatar_initials: string;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: { id: string; label: string }) => void;
}

const TYPE_COLORS: Record<EntityType, string> = {
  person: 'bg-glow-coral text-coral',
  location: 'bg-glow-amber text-amber',
  artifact: 'bg-[rgba(107,140,122,0.12)] text-sage',
};

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          const item = items[selectedIndex];
          if (item) command({ id: item.id, label: item.label });
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="mention-dropdown bg-warm-white border border-border rounded-lg shadow-card-active p-2 text-[12px] text-ink-muted">
          No entities found
        </div>
      );
    }

    return (
      <div className="mention-dropdown bg-warm-white border border-border rounded-lg shadow-card-active py-1 min-w-[200px] max-h-[240px] overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => command({ id: item.id, label: item.label })}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer
              ${index === selectedIndex ? 'bg-parchment' : 'hover:bg-parchment/60'}
            `}
          >
            <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold
              ${TYPE_COLORS[item.entity_type]}`}>
              {item.avatar_initials}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-ink truncate">{item.label}</div>
              <div className="text-[10px] text-ink-muted capitalize">{item.entity_type}</div>
            </div>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';

export default MentionList;
