import { useState } from 'react';
import {
  useRoutines,
  useCreateRoutine,
  useStartRoutine,
  useStopRoutine,
  useUpdateRoutine,
  useDeleteRoutine,
} from '../hooks/useRoutines';
import { useFieldTrips } from '../hooks/useFieldTrips';
import RoutineBanner from '../components/routines/RoutineBanner';
import RoutineModal from '../components/routines/RoutineModal';
import type { ChecklistItem, Routine } from '../types';

// ---------------------------------------------------------------------------
// RoutinesView
// ---------------------------------------------------------------------------

export default function RoutinesView() {
  const { data, isLoading } = useRoutines();
  const { data: fieldTrips = [] } = useFieldTrips();

  const createRoutine = useCreateRoutine();
  const startRoutine  = useStartRoutine();
  const stopRoutine   = useStopRoutine();
  const updateRoutine = useUpdateRoutine();
  const deleteRoutine = useDeleteRoutine();

  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [showModal, setShowModal]       = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const routines     = data?.data ?? [];
  const activeRoutine = routines.find((r) => r.is_active);

  // Save from modal
  const handleModalSave = (formData: {
    name: string;
    icon: string;
    field_trip_id: string | null;
    checklist: ChecklistItem[];
  }) => {
    if (editingRoutine) {
      updateRoutine.mutate(
        { id: editingRoutine.id, ...formData },
        { onSuccess: () => setShowModal(false) },
      );
    } else {
      createRoutine.mutate(formData, { onSuccess: () => setShowModal(false) });
    }
  };

  const handleNewRoutine = () => {
    setEditingRoutine(null);
    setShowModal(true);
  };

  const handleEdit = (routine: Routine) => {
    setEditingRoutine(routine);
    setShowModal(true);
  };

  const handleChecklistToggle = (routine: Routine, idx: number) => {
    const checklist = (Array.isArray(routine.checklist) ? routine.checklist : []) as ChecklistItem[];
    const updated   = checklist.map((item, i) =>
      i === idx ? { ...item, done: !item.done } : item
    );
    updateRoutine.mutate({ id: routine.id, checklist: updated });
  };

  const fieldTripName = (id: string | null) => {
    if (!id) return null;
    return fieldTrips.find((ft) => ft.id === id)?.name ?? null;
  };

  return (
    <div className="h-full overflow-y-auto view-enter">
      <div className="max-w-[640px] mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-serif text-[26px] font-semibold text-ink mb-0.5">Field Routines</h1>
            <p className="text-[13px] text-ink-muted">Pre-trip checklists and field protocols</p>
          </div>
          <button
            onClick={handleNewRoutine}
            className="flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-semibold text-white bg-coral hover:bg-coral-dark rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <span className="text-[14px] leading-none">+</span>
            New Routine
          </button>
        </div>

        {/* ── Active routine banner ── */}
        <div className="mb-6">
          <RoutineBanner />
        </div>

        {/* ── Routines list ── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
          </div>
        ) : routines.length === 0 ? (
          <EmptyState onNew={handleNewRoutine} />
        ) : (
          <div className="space-y-3">
            {routines.map((routine) => {
              const checklist  = (Array.isArray(routine.checklist) ? routine.checklist : []) as ChecklistItem[];
              const doneCount  = checklist.filter((c) => c.done).length;
              const totalCount = checklist.length;
              const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
              const isExpanded = expandedId === routine.id;
              const tripName   = fieldTripName(routine.field_trip_id);

              return (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  checklist={checklist}
                  doneCount={doneCount}
                  totalCount={totalCount}
                  pct={pct}
                  isExpanded={isExpanded}
                  tripName={tripName}
                  isActive={routine.is_active}
                  activeRoutineExists={!!activeRoutine}
                  onToggleExpand={() => setExpandedId(isExpanded ? null : routine.id)}
                  onStart={() => startRoutine.mutate(routine.id)}
                  onStop={() => stopRoutine.mutate(routine.id)}
                  onEdit={() => handleEdit(routine)}
                  onDelete={() => setConfirmDeleteId(routine.id)}
                  onChecklistToggle={(idx) => handleChecklistToggle(routine, idx)}
                  isStartPending={startRoutine.isPending}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <RoutineModal
          routine={editingRoutine}
          onSave={handleModalSave}
          onClose={() => setShowModal(false)}
          isSaving={createRoutine.isPending || updateRoutine.isPending}
        />
      )}

      {/* ── Delete confirm ── */}
      {confirmDeleteId && (
        <DeleteConfirmDialog
          routine={routines.find((r) => r.id === confirmDeleteId) ?? null}
          onConfirm={() => {
            deleteRoutine.mutate(confirmDeleteId);
            if (expandedId === confirmDeleteId) setExpandedId(null);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
          isDeleting={deleteRoutine.isPending}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RoutineCard
// ---------------------------------------------------------------------------

interface RoutineCardProps {
  routine: Routine;
  checklist: ChecklistItem[];
  doneCount: number;
  totalCount: number;
  pct: number;
  isExpanded: boolean;
  tripName: string | null;
  isActive: boolean;
  activeRoutineExists: boolean;
  onToggleExpand: () => void;
  onStart: () => void;
  onStop: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChecklistToggle: (idx: number) => void;
  isStartPending: boolean;
}

function RoutineCard({
  routine,
  checklist,
  doneCount,
  totalCount,
  pct,
  isExpanded,
  tripName,
  isActive,
  onToggleExpand,
  onStart,
  onStop,
  onEdit,
  onDelete,
  onChecklistToggle,
  isStartPending,
}: RoutineCardProps) {
  return (
    <div
      className={`
        rounded-xl border transition-all overflow-hidden
        ${isActive
          ? 'bg-white border-coral/30 shadow-[0_0_0_1px_rgba(207,106,76,.08),0_4px_16px_rgba(207,106,76,.08)]'
          : 'bg-white border-border-light hover:border-coral/20 hover:shadow-sm'
        }
      `}
    >
      {/* Active coral left strip */}
      {isActive && (
        <div className="h-1 w-full bg-gradient-to-r from-coral to-amber" />
      )}

      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <span className="text-[20px] flex-shrink-0 mt-0.5">{routine.icon}</span>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif font-semibold text-[14.5px] text-ink leading-tight">{routine.name}</h3>
              {isActive && (
                <span className="text-[10px] font-semibold text-white bg-coral px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Active
                </span>
              )}
            </div>
            {/* Trip association */}
            {tripName && (
              <p className="text-[11px] text-ink-ghost mt-0.5">
                <span className="mr-1">🗺</span>{tripName}
              </p>
            )}
            {/* Progress */}
            {totalCount > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-ink-muted">
                    {doneCount}/{totalCount} complete
                  </span>
                  <span className={`text-[11px] font-semibold ${pct === 100 ? 'text-sage' : 'text-ink-muted'}`}>
                    {pct}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-sand overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: pct === 100
                        ? 'var(--color-sage)'
                        : isActive
                          ? 'var(--color-coral)'
                          : 'var(--color-amber)',
                    }}
                  />
                </div>
              </div>
            )}
            {totalCount === 0 && (
              <p className="text-[11.5px] text-ink-ghost mt-1">No checklist items</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Start / End trip */}
            {isActive ? (
              <button
                onClick={onStop}
                className="px-3 py-1.5 text-[11px] font-semibold text-ink-muted bg-sand border border-border rounded-lg hover:bg-parchment hover:text-ink transition-colors cursor-pointer"
              >
                End Trip
              </button>
            ) : (
              <button
                onClick={onStart}
                disabled={isStartPending}
                className="px-3 py-1.5 text-[11px] font-semibold text-coral bg-coral/8 border border-coral/25 rounded-lg hover:bg-coral/15 transition-colors cursor-pointer disabled:opacity-50"
              >
                Start Trip
              </button>
            )}
            {/* Edit */}
            <button
              onClick={onEdit}
              title="Edit routine"
              className="w-7 h-7 flex items-center justify-center text-[12px] text-ink-ghost hover:text-coral hover:bg-coral/8 rounded-lg transition-colors cursor-pointer"
            >
              ✎
            </button>
            {/* Delete */}
            <button
              onClick={onDelete}
              title="Delete routine"
              className="w-7 h-7 flex items-center justify-center text-[12px] text-ink-ghost hover:text-coral hover:bg-coral/8 rounded-lg transition-colors cursor-pointer"
            >
              ✕
            </button>
            {/* Expand */}
            {totalCount > 0 && (
              <button
                onClick={onToggleExpand}
                className="w-7 h-7 flex items-center justify-center text-[14px] text-ink-muted hover:text-ink rounded-lg transition-all cursor-pointer"
                style={{ transform: isExpanded ? 'rotate(180deg)' : undefined }}
              >
                ▾
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded checklist */}
      {isExpanded && totalCount > 0 && (
        <div className="px-4 pb-4 border-t border-border-light pt-3 space-y-1.5">
          {checklist.map((item, idx) => (
            <label
              key={idx}
              className="flex items-center gap-3 text-[12.5px] cursor-pointer group/item rounded-lg px-2 py-1.5 hover:bg-parchment transition-colors"
            >
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={item.done ?? false}
                  onChange={() => onChecklistToggle(idx)}
                  className="w-4 h-4 rounded border-border cursor-pointer accent-coral"
                />
              </div>
              <span
                className={`
                  flex-1 leading-snug transition-all
                  ${item.done
                    ? 'line-through text-ink-ghost'
                    : 'text-ink'
                  }
                `}
              >
                {item.label || `Step ${idx + 1}`}
              </span>
              {item.done && (
                <span className="text-[10px] text-sage font-medium flex-shrink-0">✓</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
        style={{ background: 'rgba(107,140,122,.08)', border: '1px solid rgba(107,140,122,.18)' }}
      >
        📋
      </div>
      <div className="text-center max-w-[320px]">
        <p className="font-serif text-[16px] font-semibold text-ink mb-2">No routines yet</p>
        <p className="text-[13px] text-ink-muted leading-relaxed mb-5">
          Create pre-trip checklists and field protocols to ensure consistent, well-prepared fieldwork.
        </p>
        <button
          onClick={onNew}
          className="px-5 py-2.5 text-[12.5px] font-semibold text-white bg-coral hover:bg-coral-dark rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          Create your first routine
        </button>
      </div>
    </div>
  );
}

function DeleteConfirmDialog({
  routine,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  routine: Routine | null;
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
        <p className="font-serif font-semibold text-[16px] text-ink mb-2">Delete Routine?</p>
        <p className="text-[13px] text-ink-muted mb-5">
          Remove <span className="font-medium text-ink">{routine?.icon} {routine?.name}</span>?
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
