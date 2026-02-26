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
  /** Raw query text so we can offer "Create '...'" when no results match */
  query?: string;
  /** Called when the user selects the "Create" option with the new entity */
  onCreateEntity?: (name: string) => Promise<{ id: string; label: string }>;
}

const TYPE_COLORS: Record<EntityType, string> = {
  person: 'bg-glow-coral text-coral',
  location: 'bg-glow-amber text-amber',
  artifact: 'bg-[rgba(107,140,122,0.12)] text-sage',
};

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command, query = '', onCreateEntity }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isCreating, setIsCreating] = useState(false);

    // Total options = entity items + optional create row
    const showCreate = !!onCreateEntity && query.trim().length > 0;
    const totalOptions = items.length + (showCreate ? 1 : 0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const handleCreate = async () => {
      if (!onCreateEntity || !query.trim() || isCreating) return;
      setIsCreating(true);
      try {
        const newItem = await onCreateEntity(query.trim());
        command(newItem);
      } finally {
        setIsCreating(false);
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (totalOptions === 0) return false;

        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + totalOptions - 1) % totalOptions);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % totalOptions);
          return true;
        }
        if (event.key === 'Enter') {
          if (selectedIndex < items.length) {
            const item = items[selectedIndex];
            if (item) command({ id: item.id, label: item.label });
          } else if (showCreate) {
            void handleCreate();
          }
          return true;
        }
        return false;
      },
    }));

    if (totalOptions === 0) {
      return (
        <div className="mention-dropdown bg-warm-white border border-border rounded-lg shadow-card-active p-2 text-[12px] text-ink-muted">
          No entities found
        </div>
      );
    }

    return (
      <div className="mention-dropdown bg-warm-white border border-border rounded-lg shadow-card-active py-1 min-w-[200px] max-h-[260px] overflow-y-auto">
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

        {showCreate && (
          <>
            {items.length > 0 && (
              <div className="mx-3 my-1 border-t border-border/50" />
            )}
            <button
              onClick={() => void handleCreate()}
              disabled={isCreating}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer
                ${selectedIndex === items.length ? 'bg-parchment' : 'hover:bg-parchment/60'}
                ${isCreating ? 'opacity-50 cursor-wait' : ''}
              `}
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold bg-glow-coral text-coral">
                +
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-coral truncate">
                  {isCreating ? 'Creating...' : `Create "${query.trim()}"`}
                </div>
                <div className="text-[10px] text-ink-muted">New entity</div>
              </div>
            </button>
          </>
        )}
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';

export default MentionList;
