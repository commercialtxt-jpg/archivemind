import { useState } from 'react';
import { useRoutines, useCreateRoutine, useStartRoutine } from '../hooks/useRoutines';
import RoutineBanner from '../components/routines/RoutineBanner';

export default function RoutinesView() {
  const { data, isLoading } = useRoutines();
  const createRoutine = useCreateRoutine();
  const startRoutine = useStartRoutine();
  const [newName, setNewName] = useState('');
  const routines = data?.data ?? [];

  const handleCreate = () => {
    if (!newName.trim()) return;
    createRoutine.mutate({ name: newName.trim(), checklist: [] });
    setNewName('');
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[600px] mx-auto px-6 py-8">
        <h1 className="font-serif text-[24px] font-semibold text-ink mb-1">Routines</h1>
        <p className="text-[13px] text-ink-muted mb-6">Pre-trip checklists and field protocols</p>

        {/* Active routine banner */}
        <div className="mb-6">
          <RoutineBanner />
        </div>

        {/* Add routine */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="New routine name..."
            className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-border bg-white text-ink placeholder:text-ink-ghost outline-none focus:border-coral/40 transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || createRoutine.isPending}
            className="px-4 py-2 text-[12px] font-semibold text-white bg-coral rounded-lg hover:bg-coral-light transition-colors cursor-pointer disabled:opacity-50"
          >
            Create
          </button>
        </div>

        {/* Routines list */}
        {isLoading ? (
          <p className="text-sm text-ink-muted">Loading...</p>
        ) : routines.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-8">No routines yet</p>
        ) : (
          <div className="space-y-2">
            {routines.map((routine) => (
              <div
                key={routine.id}
                className={`
                  flex items-center justify-between p-4 rounded-xl border transition-all
                  ${routine.is_active
                    ? 'bg-coral/5 border-coral/25'
                    : 'bg-white border-border-light hover:border-coral/20'
                  }
                `}
              >
                <div>
                  <h3 className="font-serif font-semibold text-[14px] text-ink">{routine.name}</h3>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {Array.isArray(routine.checklist) ? `${routine.checklist.length} items` : 'No items'}
                    {routine.is_active && <span className="ml-2 text-coral font-medium">Active</span>}
                  </p>
                </div>
                {!routine.is_active && (
                  <button
                    onClick={() => startRoutine.mutate(routine.id)}
                    disabled={startRoutine.isPending}
                    className="px-3 py-1.5 text-[11px] font-semibold text-coral bg-coral/8 border border-coral/25 rounded-lg hover:bg-coral/15 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Start Trip
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
