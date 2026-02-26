import type { PlanTier, PlanLimits, UsageRecord } from '../../types';
import UsageMeters from './UsageMeters';

interface Props {
  tier: PlanTier;
  limits: PlanLimits;
  usage: UsageRecord;
  planStartedAt: string | null;
  mapBudgetPct?: number;
}

const tierLabels: Record<PlanTier, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
};

const tierPrices: Record<PlanTier, string> = {
  free: '$0/mo',
  pro: '$12/mo',
  team: '$39/mo per seat',
};

export default function PlanCard({ tier, limits, usage, planStartedAt, mapBudgetPct }: Props) {
  return (
    <div className="bg-card-bg border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-serif font-semibold text-ink">
              {tierLabels[tier]} Plan
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-coral/10 text-coral uppercase tracking-wide">
              {tier}
            </span>
          </div>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {tierPrices[tier]}
            {planStartedAt && (
              <span className="ml-2">
                &middot; Since {new Date(planStartedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </p>
        </div>
      </div>

      <h4 className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-4">
        Current Usage
      </h4>
      <UsageMeters usage={usage} limits={limits} mapBudgetPct={mapBudgetPct} currentTier={tier} />
    </div>
  );
}
