import { useState } from 'react';
import type { InventoryItem } from '../../types';
import { STATUS_CYCLE } from './inventoryConfig';

const CATEGORIES = [
  { value: 'general',    label: 'General' },
  { value: 'recording',  label: 'Recording' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'power',      label: 'Power' },
  { value: 'supplies',   label: 'Supplies' },
];

const STATUS_LABELS: Record<string, string> = {
  packed:   'Packed',
  ready:    'Ready',
  charged:  'Charged',
  low:      'Low',
  missing:  'Missing',
};

const ICON_PRESETS = ['📦', '🎙', '📷', '🔋', '🗺', '⌚', '💊', '🔦', '🔌', '📡', '🎒', '🖊', '📓', '🔧', '🧪'];

interface InventoryItemModalProps {
  item?: InventoryItem | null;
  onSave: (data: {
    name: string;
    icon: string;
    category: string;
    notes: string;
    status: string;
  }) => void;
  onClose: () => void;
  isSaving?: boolean;
}

/**
 * Inner form — receives stable initial values as props.
 * Never syncs from parent after mount (no useEffect setState pattern).
 */
function InventoryItemForm({
  item,
  onSave,
  onClose,
  isSaving,
}: InventoryItemModalProps) {
  const initIcon = item?.icon ?? '📦';
  const [name, setName]         = useState(item?.name ?? '');
  const [icon, setIcon]         = useState(initIcon);
  const [category, setCategory] = useState(item?.category ?? 'general');
  const [status, setStatus]     = useState(item?.status ?? 'packed');
  const [notes, setNotes]       = useState(item?.notes ?? '');
  const [customIcon, setCustomIcon] = useState(!ICON_PRESETS.includes(initIcon));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), icon, category, notes, status });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(42,36,32,.45)', backdropFilter: 'blur(3px)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-[420px] bg-warm-white rounded-2xl border border-border shadow-[0_20px_60px_rgba(0,0,0,.18)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-serif font-semibold text-[16px] text-ink">
            {item ? 'Edit Item' : 'Add Item'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-sand rounded-lg transition-colors cursor-pointer text-[13px]"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Icon picker */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ICON_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => { setIcon(preset); setCustomIcon(false); }}
                  className={`
                    w-9 h-9 rounded-lg text-[18px] flex items-center justify-center
                    border transition-all cursor-pointer
                    ${icon === preset && !customIcon
                      ? 'bg-coral/10 border-coral/40 shadow-[0_0_0_2px_rgba(207,106,76,.15)]'
                      : 'bg-white border-border-light hover:border-coral/30 hover:bg-parchment'
                    }
                  `}
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCustomIcon(!customIcon)}
                className="text-[11px] text-coral hover:text-coral-dark cursor-pointer underline underline-offset-2"
              >
                {customIcon ? 'Use presets' : 'Custom emoji'}
              </button>
              {customIcon && (
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value.slice(0, 2))}
                  placeholder="Emoji"
                  className="w-20 px-2 py-1 text-[14px] text-center rounded-lg border border-border bg-white text-ink outline-none focus:border-coral/40 transition-colors"
                />
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
              Name <span className="text-coral">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sony PCM-A10 Recorder"
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-border bg-white text-ink placeholder:text-ink-ghost outline-none focus:border-coral/40 transition-colors"
            />
          </div>

          {/* Category + Status side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-border bg-white text-ink outline-none focus:border-coral/40 transition-colors cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-border bg-white text-ink outline-none focus:border-coral/40 transition-colors cursor-pointer"
              >
                {STATUS_CYCLE.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Charging instructions, location, reminders..."
              rows={2}
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-border bg-white text-ink placeholder:text-ink-ghost outline-none focus:border-coral/40 transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-semibold text-ink-muted bg-sand hover:bg-parchment border border-border rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="px-5 py-2 text-[12px] font-semibold text-white bg-coral hover:bg-coral-dark rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : item ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Exported wrapper — uses `key` to remount the form whenever `item` changes,
 * so state initializers always get the correct starting values without useEffect.
 */
export default function InventoryItemModal(props: InventoryItemModalProps) {
  return <InventoryItemForm key={props.item?.id ?? 'new'} {...props} />;
}
