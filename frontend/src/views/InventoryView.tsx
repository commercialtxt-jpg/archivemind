import { useState, useMemo } from 'react';
import {
  useInventory,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
} from '../hooks/useInventory';
import InventoryCard from '../components/inventory/InventoryCard';
import { STATUS_CYCLE } from '../components/inventory/inventoryConfig';
import InventoryItemModal from '../components/inventory/InventoryItemModal';
import InventoryAlert from '../components/inventory/InventoryAlert';
import type { InventoryItem } from '../types';

// ---------------------------------------------------------------------------
// Category filter tabs
// ---------------------------------------------------------------------------

const CATEGORY_TABS = [
  { value: 'all',        label: 'All' },
  { value: 'recording',  label: 'Recording' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'power',      label: 'Power' },
  { value: 'supplies',   label: 'Supplies' },
  { value: 'general',    label: 'General' },
];

// ---------------------------------------------------------------------------
// InventoryView
// ---------------------------------------------------------------------------

export default function InventoryView() {
  const { data, isLoading } = useInventory();
  const createItem   = useCreateInventoryItem();
  const updateItem   = useUpdateInventoryItem();
  const deleteItem   = useDeleteInventoryItem();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showModal, setShowModal]           = useState(false);
  const [editingItem, setEditingItem]       = useState<InventoryItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const items = useMemo(() => data?.data ?? [], [data]);

  // Category filter
  const filteredItems = useMemo(() => {
    if (categoryFilter === 'all') return items;
    return items.filter((i) => (i.category ?? 'general') === categoryFilter);
  }, [items, categoryFilter]);

  // Stats
  const badStatuses = ['low', 'missing'];
  const readyCount = items.filter((i) => !badStatuses.includes(i.status)).length;
  const alertCount = items.filter((i) => badStatuses.includes(i.status)).length;
  const readyPct   = items.length > 0 ? Math.round((readyCount / items.length) * 100) : 0;

  // Status cycle handler
  const handleStatusChange = (id: string, currentStatus: string) => {
    const idx  = STATUS_CYCLE.indexOf(currentStatus);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    updateItem.mutate({ id, status: next });
  };

  // Open add modal
  const handleAddClick = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  // Open edit modal
  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  // Save from modal (create or update)
  const handleModalSave = (formData: {
    name: string;
    icon: string;
    category: string;
    notes: string;
    status: string;
  }) => {
    if (editingItem) {
      updateItem.mutate(
        { id: editingItem.id, ...formData },
        { onSuccess: () => setShowModal(false) },
      );
    } else {
      createItem.mutate(formData, { onSuccess: () => setShowModal(false) });
    }
  };

  // Delete with confirmation
  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      deleteItem.mutate(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto view-enter">
      <div className="max-w-[720px] mx-auto p-4 md:px-6 md:py-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-serif text-[26px] font-semibold text-ink mb-0.5">Field Kit</h1>
            <p className="text-[13px] text-ink-muted">Track equipment and supplies for your field trips</p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-semibold text-white bg-coral hover:bg-coral-dark rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <span className="text-[14px] leading-none">+</span>
            Add Item
          </button>
        </div>

        {/* ── Alerts ── */}
        <div className="mb-4">
          <InventoryAlert />
        </div>

        {/* ── Stats bar ── */}
        {items.length > 0 && (
          <div className="bg-white border border-border-light rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-5">
                <Stat value={items.length} label="Total" />
                <Stat value={readyCount} label="Ready" color="text-sage" />
                {alertCount > 0 && <Stat value={alertCount} label="Needs Attention" color="text-coral" />}
              </div>
              <span
                className="text-[12px] font-semibold"
                style={{ color: readyPct === 100 ? 'var(--color-sage)' : readyPct >= 70 ? 'var(--color-amber)' : 'var(--color-coral)' }}
              >
                {readyPct}% ready
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-sand overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${readyPct}%`,
                  background: readyPct === 100
                    ? 'var(--color-sage)'
                    : readyPct >= 70
                      ? 'var(--color-amber)'
                      : 'var(--color-coral)',
                }}
              />
            </div>
          </div>
        )}

        {/* ── Category filter tabs ── */}
        {items.length > 0 && (
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {CATEGORY_TABS.map((tab) => {
              const count = tab.value === 'all'
                ? items.length
                : items.filter((i) => (i.category ?? 'general') === tab.value).length;
              if (tab.value !== 'all' && count === 0) return null;
              return (
                <button
                  key={tab.value}
                  onClick={() => setCategoryFilter(tab.value)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium
                    border transition-all cursor-pointer
                    ${categoryFilter === tab.value
                      ? 'bg-coral text-white border-coral shadow-sm'
                      : 'bg-white text-ink-muted border-border-light hover:border-coral/30 hover:text-ink'
                    }
                  `}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`
                        text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                        ${categoryFilter === tab.value ? 'bg-white/20 text-white' : 'bg-sand text-ink-ghost'}
                      `}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Content ── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState onAdd={handleAddClick} />
        ) : filteredItems.length === 0 ? (
          <p className="text-[13px] text-ink-muted text-center py-10">
            No items in this category.{' '}
            <button
              onClick={() => setCategoryFilter('all')}
              className="text-coral hover:underline cursor-pointer"
            >
              Show all
            </button>
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredItems.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                onStatusChange={handleStatusChange}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <InventoryItemModal
          item={editingItem}
          onSave={handleModalSave}
          onClose={() => setShowModal(false)}
          isSaving={createItem.isPending || updateItem.isPending}
        />
      )}

      {/* ── Delete confirmation dialog ── */}
      {confirmDeleteId && (
        <DeleteConfirmDialog
          item={items.find((i) => i.id === confirmDeleteId) ?? null}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
          isDeleting={deleteItem.isPending}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Stat({ value, label, color = 'text-ink' }: { value: number; label: string; color?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`font-mono font-semibold text-[18px] leading-none ${color}`}>{value}</span>
      <span className="text-[11px] text-ink-ghost">{label}</span>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
        style={{ background: 'rgba(107,140,122,.08)', border: '1px solid rgba(107,140,122,.18)' }}
      >
        🎒
      </div>
      <div className="text-center max-w-[300px]">
        <p className="font-serif text-[16px] font-semibold text-ink mb-2">Your kit is empty</p>
        <p className="text-[13px] text-ink-muted leading-relaxed mb-5">
          Add your field equipment and supplies to track what you need before each trip.
        </p>
        <button
          onClick={onAdd}
          className="px-5 py-2.5 text-[12.5px] font-semibold text-white bg-coral hover:bg-coral-dark rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          Add your first item
        </button>
      </div>
    </div>
  );
}

function DeleteConfirmDialog({
  item,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  item: InventoryItem | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(42,36,32,.45)', backdropFilter: 'blur(3px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[360px] bg-warm-white rounded-2xl border border-border shadow-[0_20px_60px_rgba(0,0,0,.18)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-serif font-semibold text-[16px] text-ink mb-2">Delete Item?</p>
        <p className="text-[13px] text-ink-muted mb-5">
          Remove <span className="font-medium text-ink">{item?.icon} {item?.name}</span> from your kit?
          This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[12px] font-semibold text-ink-muted bg-sand hover:bg-parchment border border-border rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-[12px] font-semibold text-white bg-coral hover:bg-coral-dark rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
