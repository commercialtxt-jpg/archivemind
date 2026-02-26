import type { PlanTier } from '../../types';

interface Props {
  currentTier: PlanTier;
}

interface TierColumn {
  tier: PlanTier;
  name: string;
  price: string;
  mapLoads: string;
  storage: string;
  notes: string;
  entities: string;
  mediaUploads: string;
  ai: string;
  workspaces: string;
  teamMembers: string;
}

const tiers: TierColumn[] = [
  {
    tier: 'free', name: 'Free', price: '$0', mapLoads: '50', storage: '100 MB',
    notes: '50', entities: '25', mediaUploads: '50', ai: '—',
    workspaces: '1', teamMembers: '1',
  },
  {
    tier: 'pro', name: 'Pro', price: '$12/mo', mapLoads: '2,000', storage: '5 GB',
    notes: 'Unlimited', entities: 'Unlimited', mediaUploads: '500', ai: 'Basic',
    workspaces: '1', teamMembers: '1',
  },
  {
    tier: 'team', name: 'Team', price: '$39/mo/seat', mapLoads: '10,000', storage: '25 GB',
    notes: 'Unlimited', entities: 'Unlimited', mediaUploads: '2,000', ai: 'Full',
    workspaces: '5', teamMembers: '10',
  },
];

const rows: Array<{ label: string; key: keyof TierColumn }> = [
  { label: 'Map loads/mo', key: 'mapLoads' },
  { label: 'Storage', key: 'storage' },
  { label: 'Notes', key: 'notes' },
  { label: 'Entities', key: 'entities' },
  { label: 'Media uploads', key: 'mediaUploads' },
  { label: 'AI features', key: 'ai' },
  { label: 'Workspaces', key: 'workspaces' },
  { label: 'Team members', key: 'teamMembers' },
];

export default function TierComparison({ currentTier }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr>
            <th className="text-left py-3 pr-4 text-ink-muted font-medium text-[11px] uppercase tracking-widest">
              Feature
            </th>
            {tiers.map((t) => (
              <th
                key={t.tier}
                className={`text-center py-3 px-4 font-semibold ${
                  t.tier === currentTier ? 'text-coral' : 'text-ink'
                }`}
              >
                <div>{t.name}</div>
                <div className="text-[11px] font-normal text-ink-muted">{t.price}</div>
                {t.tier === currentTier && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] rounded-full bg-coral/10 text-coral font-semibold">
                    Current
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-border-light">
              <td className="py-2.5 pr-4 text-ink-mid">{row.label}</td>
              {tiers.map((t) => (
                <td
                  key={t.tier}
                  className={`text-center py-2.5 px-4 ${
                    t.tier === currentTier
                      ? 'font-medium text-ink bg-glow-coral/30'
                      : 'text-ink-soft'
                  }`}
                >
                  {t[row.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* CTA buttons */}
      <div className="flex justify-center gap-3 mt-6">
        {tiers
          .filter((t) => t.tier !== currentTier)
          .map((t) => {
            const isUpgrade = tiers.findIndex((x) => x.tier === t.tier) > tiers.findIndex((x) => x.tier === currentTier);
            return (
              <button
                key={t.tier}
                className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                  isUpgrade
                    ? 'bg-coral text-white hover:bg-coral-dark shadow-coral-btn'
                    : 'bg-sand text-ink-mid hover:bg-sand-dark'
                }`}
              >
                {isUpgrade ? `Upgrade to ${t.name}` : `Downgrade to ${t.name}`}
              </button>
            );
          })}
      </div>
    </div>
  );
}
