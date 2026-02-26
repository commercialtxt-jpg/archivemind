import { useState } from 'react';
import type { Routine, ChecklistItem } from '../../types';
import { useFieldTrips } from '../../hooks/useFieldTrips';

const ICON_PRESETS = ['📋', '🗓', '🔄', '✅', '🎯', '🚀', '🏕', '📡', '🗺', '🎒', '🔬', '📷'];

interface RoutineModalProps {
  routine?: Routine | null;
  onSave: (data: {
    name: string;
    icon: string;
    field_trip_id: string | null;
    checklist: ChecklistItem[];
  }) => void;
  onClose: () => void;
  isSaving?: boolean;
}

/**
 * Inner form — all state initialized once from props.
 * Never re-syncs from parent via useEffect to avoid setState-in-effect warning.
 */
function RoutineModalForm({ routine, onSave, onClose, isSaving = false }: RoutineModalProps) {
  const { data: fieldTrips = [] } = useFieldTrips();

  const [name, setName]               = useState(routine?.name ?? '');
  const [icon, setIcon]               = useState(routine?.icon ?? '📋');
  const [fieldTripId, setFieldTripId] = useState<string>(routine?.field_trip_id ?? '');
  const [steps, setSteps]             = useState<ChecklistItem[]>(
    () => (Array.isArray(routine?.checklist) ? routine.checklist : [])
  );
  const [newStep, setNewStep] = useState('');

  const handleAddStep = () => {
    const label = newStep.trim();
    if (!label) return;
    setSteps((prev) => [...prev, { label, done: false }]);
    setNewStep('');
  };

  const handleStepChange = (idx: number, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, label: value } : s)));
  };

  const handleRemoveStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      icon,
      field_trip_id: fieldTripId || null,
      checklist: steps,
    });
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
        className="w-full max-w-[480px] bg-warm-white rounded-2xl border border-border shadow-[0_20px_60px_rgba(0,0,0,.18)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-serif font-semibold text-[16px] text-ink">
            {routine ? 'Edit Routine' : 'New Routine'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-sand rounded-lg transition-colors cursor-pointer text-[13px]"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          <form id="routine-form" onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {/* Icon picker */}
            <div>
              <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-2">
                Icon
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ICON_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setIcon(preset)}
                    className={`
                      w-9 h-9 rounded-lg text-[18px] flex items-center justify-center
                      border transition-all cursor-pointer
                      ${icon === preset
                        ? 'bg-coral/10 border-coral/40 shadow-[0_0_0_2px_rgba(207,106,76,.15)]'
                        : 'bg-white border-border-light hover:border-coral/30 hover:bg-parchment'
                      }
                    `}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                Routine Name <span className="text-coral">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pre-Interview Setup"
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-border bg-white text-ink placeholder:text-ink-ghost outline-none focus:border-coral/40 transition-colors"
              />
            </div>

            {/* Field trip association */}
            <div>
              <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                Field Trip (optional)
              </label>
              <select
                value={fieldTripId}
                onChange={(e) => setFieldTripId(e.target.value)}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-border bg-white text-ink outline-none focus:border-coral/40 transition-colors cursor-pointer"
              >
                <option value="">None</option>
                {fieldTrips.map((ft) => (
                  <option key={ft.id} value={ft.id}>
                    {ft.icon} {ft.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Checklist steps */}
            <div>
              <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wide mb-2">
                Checklist Steps
              </label>

              {steps.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[12px] text-ink-ghost w-5 text-center flex-shrink-0 select-none">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={step.label}
                        onChange={(e) => handleStepChange(idx, e.target.value)}
                        placeholder={`Step ${idx + 1}`}
                        className="flex-1 px-2.5 py-1.5 text-[12.5px] rounded-lg border border-border-light bg-white text-ink placeholder:text-ink-ghost outline-none focus:border-coral/40 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="w-6 h-6 flex items-center justify-center text-ink-ghost hover:text-coral hover:bg-coral/8 rounded transition-colors cursor-pointer text-[11px] flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new step input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddStep(); }
                  }}
                  placeholder="Add a step... (press Enter)"
                  className="flex-1 px-2.5 py-1.5 text-[12.5px] rounded-lg border border-border-light bg-parchment text-ink placeholder:text-ink-ghost outline-none focus:border-coral/40 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddStep}
                  disabled={!newStep.trim()}
                  className="px-3 py-1.5 text-[11px] font-semibold text-coral bg-coral/8 border border-coral/20 rounded-lg hover:bg-coral/15 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  + Add
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-semibold text-ink-muted bg-sand hover:bg-parchment border border-border rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="routine-form"
            disabled={!name.trim() || isSaving}
            className="px-5 py-2 text-[12px] font-semibold text-white bg-coral hover:bg-coral-dark rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : routine ? 'Save Changes' : 'Create Routine'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Exported wrapper — uses `key` to remount the inner form when `routine` changes,
 * so state initializers always get correct initial values without useEffect.
 */
export default function RoutineModal(props: RoutineModalProps) {
  return <RoutineModalForm key={props.routine?.id ?? 'new'} {...props} />;
}
