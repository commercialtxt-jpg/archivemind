import { useState } from 'react';
import api from '../../lib/api';

interface Props {
  gracePeriodEnd: string;
  preGracePlan: string;
}

export default function GracePeriodBanner({ gracePeriodEnd, preGracePlan }: Props) {
  const [loading, setLoading] = useState(false);
  const end = new Date(gracePeriodEnd);
  const now = new Date();

  if (end <= now) return null;

  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const planLabel = preGracePlan.charAt(0).toUpperCase() + preGracePlan.slice(1);

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/billing/portal');
      const url = data.data?.portal_url;
      if (url) window.open(url, '_blank');
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-amber/10 border border-amber/30 rounded-lg px-4 py-3 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none mt-0.5">&#9888;</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-ink">
            Payment failed — update your payment method within{' '}
            <strong>{diffDays} {diffDays === 1 ? 'day' : 'days'}</strong> to keep {planLabel} features.
          </p>
          <button
            onClick={handleManageBilling}
            disabled={loading}
            className="mt-2 px-4 py-1.5 text-[12px] font-medium text-white bg-amber rounded-lg
              hover:bg-amber/90 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Opening...' : 'Update Payment Method'}
          </button>
        </div>
      </div>
    </div>
  );
}
