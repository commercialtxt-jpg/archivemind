import type { PlanLimits, PlanTier, UsageRecord } from '../../types';

interface Props {
  usage: UsageRecord;
  limits: PlanLimits;
  mapBudgetPct?: number;
  currentTier?: PlanTier;
}

interface MeterDef {
  label: string;
  current: number;
  limit: number;
  format?: (n: number) => string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function meterColor(pct: number): string {
  if (pct >= 90) return 'bg-coral';
  if (pct >= 70) return 'bg-amber';
  return 'bg-sage';
}

function meterTextColor(pct: number): string {
  if (pct >= 90) return 'text-coral';
  if (pct >= 70) return 'text-amber';
  return 'text-sage';
}

export default function UsageMeters({ usage, limits, mapBudgetPct, currentTier }: Props) {
  const meters: MeterDef[] = [
    { label: 'Notes', current: usage.notes_count, limit: limits.notes },
    { label: 'Entities', current: usage.entities_count, limit: limits.entities },
    { label: 'Media Uploads', current: usage.media_uploads, limit: limits.media_uploads },
    { label: 'Map Loads', current: usage.map_loads, limit: limits.map_loads },
    { label: 'Storage', current: usage.storage_bytes, limit: limits.storage_bytes, format: formatBytes },
    { label: 'AI Requests', current: usage.ai_requests, limit: limits.ai_requests },
  ];

  const showBudgetWarning = mapBudgetPct != null && mapBudgetPct >= 0.8 && currentTier === 'free';

  return (
    <div className="space-y-4">
      {meters.map((m) => {
        const isUnlimited = m.limit < 0;
        const pct = isUnlimited ? 0 : m.limit === 0 ? 100 : Math.min(100, Math.round((m.current / m.limit) * 100));
        const fmt = m.format ?? ((n: number) => String(n));

        return (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-medium text-ink-mid">{m.label}</span>
              <span className={`text-[12px] font-mono ${meterTextColor(pct)}`}>
                {fmt(m.current)} / {isUnlimited ? '∞' : fmt(m.limit)}
              </span>
            </div>
            <div className="h-2 bg-sand rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isUnlimited ? 'bg-sage w-0' : meterColor(pct)}`}
                style={{ width: isUnlimited ? '0%' : `${pct}%` }}
              />
            </div>
          </div>
        );
      })}

      {showBudgetWarning && (
        <p className="text-[12px] text-amber font-medium mt-2">
          Map access may be limited during peak usage. Upgrade for guaranteed access.
        </p>
      )}
    </div>
  );
}
