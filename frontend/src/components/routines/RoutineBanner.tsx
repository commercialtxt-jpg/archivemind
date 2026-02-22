import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import type { ApiResponse, Routine } from '../../types';

export default function RoutineBanner() {
  const queryClient = useQueryClient();

  const { data: routines } = useQuery({
    queryKey: ['routines'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Routine[]>>('/routines');
      return data.data;
    },
  });

  const startRoutine = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Routine>>(`/routines/${id}/start`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });

  const activeRoutine = routines?.find((r) => r.is_active);

  if (!routines?.length) return null;

  // If there's an active routine, show it
  if (activeRoutine) {
    const checklist = Array.isArray(activeRoutine.checklist) ? activeRoutine.checklist : [];
    const checked = checklist.filter((c: { done?: boolean }) => c.done).length;
    const total = checklist.length;

    return (
      <div className="bg-gradient-to-r from-coral/10 via-amber/8 to-sage/8 border border-coral/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-serif font-semibold text-[14px] text-ink">
            {activeRoutine.name}
          </h3>
          <span className="text-[11px] font-mono text-ink-muted">
            {checked}/{total} completed
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-sand overflow-hidden mb-3">
          <div
            className="h-full bg-coral rounded-full transition-all duration-300"
            style={{ width: total > 0 ? `${(checked / total) * 100}%` : '0%' }}
          />
        </div>

        {/* Checklist summary (first few items) */}
        <div className="space-y-1">
          {checklist.slice(0, 4).map((item: { label?: string; done?: boolean }, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[12px]">
              <span className={item.done ? 'text-sage' : 'text-ink-ghost'}>
                {item.done ? '✓' : '○'}
              </span>
              <span className={item.done ? 'text-ink-muted line-through' : 'text-ink-mid'}>
                {item.label || `Step ${i + 1}`}
              </span>
            </div>
          ))}
          {checklist.length > 4 && (
            <p className="text-[11px] text-ink-muted">+{checklist.length - 4} more items</p>
          )}
        </div>
      </div>
    );
  }

  // No active routine — show start buttons
  return (
    <div className="bg-parchment border border-border rounded-xl p-4">
      <h3 className="font-serif font-semibold text-[14px] text-ink mb-3">
        Start a Routine
      </h3>
      <div className="space-y-2">
        {routines.slice(0, 3).map((routine) => (
          <button
            key={routine.id}
            onClick={() => startRoutine.mutate(routine.id)}
            disabled={startRoutine.isPending}
            className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white border border-border-light hover:border-coral/30 hover:bg-glow-coral transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="text-[12.5px] font-medium text-ink">{routine.name}</span>
            <span className="text-[10px] text-coral font-semibold uppercase">Start</span>
          </button>
        ))}
      </div>
    </div>
  );
}
