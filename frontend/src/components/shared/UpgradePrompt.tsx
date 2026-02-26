import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  resource: string;
  message?: string;
  onDismiss?: () => void;
}

export default function UpgradePrompt({ resource, message, onDismiss }: Props) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const isBudgetThrottle = message?.toLowerCase().includes('temporarily limited');
  const title = isBudgetThrottle ? 'Maps Temporarily Limited' : 'Plan Limit Reached';
  const body = isBudgetThrottle
    ? 'Map access is temporarily limited during peak platform usage. Upgrade for guaranteed access.'
    : message || `You've reached your plan limit for ${resource}. Upgrade to Pro for higher limits.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 animate-fade-in">
      <div className="bg-warm-white rounded-xl shadow-card-active max-w-md w-full mx-4 p-6 animate-scale-in">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-coral/10 flex items-center justify-center">
            <span className="text-2xl">{isBudgetThrottle ? '\u23F3' : '\uD83D\uDD12'}</span>
          </div>
          <h3 className="text-lg font-serif font-semibold text-ink mb-2">
            {title}
          </h3>
          <p className="text-[13px] text-ink-soft mb-4">
            {body}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 text-[13px] font-medium text-ink-mid bg-sand rounded-lg hover:bg-sand-dark transition-colors cursor-pointer"
          >
            Dismiss
          </button>
          <button
            onClick={() => {
              handleDismiss();
              navigate('/settings');
            }}
            className="flex-1 px-4 py-2 text-[13px] font-medium text-white bg-coral rounded-lg hover:bg-coral-dark shadow-coral-btn transition-colors cursor-pointer"
          >
            {isBudgetThrottle ? 'Upgrade Now' : 'View Plans'}
          </button>
        </div>
      </div>
    </div>
  );
}
