import { useState } from 'react';
import { useInventory, useCreateInventoryItem } from '../hooks/useInventory';
import InventoryCard from '../components/inventory/InventoryCard';
import InventoryAlert from '../components/inventory/InventoryAlert';

export default function InventoryView() {
  const { data, isLoading } = useInventory();
  const createItem = useCreateInventoryItem();
  const [newName, setNewName] = useState('');
  const items = data?.data ?? [];

  const handleCreate = () => {
    if (!newName.trim()) return;
    createItem.mutate({ name: newName.trim() });
    setNewName('');
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[600px] mx-auto px-6 py-8">
        <h1 className="font-serif text-[24px] font-semibold text-ink mb-1">Inventory</h1>
        <p className="text-[13px] text-ink-muted mb-6">Track your field equipment and supplies</p>

        {/* Alert banner */}
        <div className="mb-4">
          <InventoryAlert />
        </div>

        {/* Add item */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Add new item..."
            className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-border bg-white text-ink placeholder:text-ink-ghost outline-none focus:border-coral/40 transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || createItem.isPending}
            className="px-4 py-2 text-[12px] font-semibold text-white bg-coral rounded-lg hover:bg-coral-light transition-colors cursor-pointer disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {/* Items list */}
        {isLoading ? (
          <p className="text-sm text-ink-muted">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-8">No inventory items yet</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <InventoryCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
