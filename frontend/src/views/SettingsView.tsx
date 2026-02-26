import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { usePlan } from '../hooks/useUsage';
import { useAuthStore } from '../stores/authStore';
import PlanCard from '../components/settings/PlanCard';
import TierComparison from '../components/settings/TierComparison';
import api from '../lib/api';
import type { User, UsageResponse } from '../types';

type Tab = 'plan' | 'profile' | 'account';

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<Tab>('plan');
  const { data: planData, isLoading } = usePlan();
  const user = useAuthStore((s) => s.user);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'plan', label: 'Plan & Usage' },
    { id: 'profile', label: 'Profile' },
    { id: 'account', label: 'Account' },
  ];

  return (
    <div className="h-full overflow-y-auto view-enter">
      <div className="max-w-[720px] mx-auto px-6 py-8">
        {/* Header */}
        <h1 className="text-2xl font-serif font-semibold text-ink mb-1">Settings</h1>
        <p className="text-[13px] text-ink-muted mb-6">Manage your plan, profile, and account</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border-light">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-[13px] font-medium transition-colors cursor-pointer -mb-px ${
                activeTab === tab.id
                  ? 'text-coral border-b-2 border-coral'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'plan' && <PlanTab planData={planData} isLoading={isLoading} />}
        {activeTab === 'profile' && <ProfileTab user={user} />}
        {activeTab === 'account' && <AccountTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan & Usage Tab
// ---------------------------------------------------------------------------
function PlanTab({ planData, isLoading }: { planData: UsageResponse | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!planData) {
    return <p className="text-[13px] text-ink-muted">Unable to load plan data.</p>;
  }

  return (
    <div className="space-y-8">
      <PlanCard
        tier={planData.plan}
        limits={planData.limits}
        usage={planData.usage}
        planStartedAt={planData.plan_started_at}
      />

      <div>
        <h3 className="text-[15px] font-serif font-semibold text-ink mb-4">Compare Plans</h3>
        <TierComparison currentTier={planData.plan} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile Tab
// ---------------------------------------------------------------------------
function ProfileTab({ user }: { user: User | null }) {
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saved, setSaved] = useState(false);

  const updateProfile = useMutation({
    mutationFn: async (body: { display_name?: string; email?: string }) => {
      const { data } = await api.put('/settings/profile', body);
      return data.data;
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({ display_name: displayName, email });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-5">
      <div>
        <label className="block text-[12px] font-medium text-ink-mid mb-1.5">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-3 py-2 text-[13px] bg-white border border-border rounded-lg
            focus:border-coral focus:ring-3 focus:ring-glow-coral outline-none transition-all"
        />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-ink-mid mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 text-[13px] bg-white border border-border rounded-lg
            focus:border-coral focus:ring-3 focus:ring-glow-coral outline-none transition-all"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={updateProfile.isPending}
          className="px-5 py-2 text-[13px] font-medium text-white bg-coral rounded-lg
            hover:bg-coral-dark shadow-coral-btn transition-colors cursor-pointer disabled:opacity-50"
        >
          {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && <span className="text-[12px] text-sage font-medium">Saved!</span>}
        {updateProfile.isError && (
          <span className="text-[12px] text-coral font-medium">Failed to save</span>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Account Tab
// ---------------------------------------------------------------------------
function AccountTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const changePassword = useMutation({
    mutationFn: async (body: { current_password: string; new_password: string }) => {
      await api.put('/settings/password', body);
    },
    onSuccess: () => {
      setSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => {
      setError('Failed to update password. Check your current password.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    changePassword.mutate({ current_password: currentPassword, new_password: newPassword });
  };

  return (
    <div className="space-y-8">
      {/* Change Password */}
      <div>
        <h3 className="text-[15px] font-serif font-semibold text-ink mb-4">Change Password</h3>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-ink-mid mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-white border border-border rounded-lg
                focus:border-coral focus:ring-3 focus:ring-glow-coral outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-mid mb-1.5">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-white border border-border rounded-lg
                focus:border-coral focus:ring-3 focus:ring-glow-coral outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-mid mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-white border border-border rounded-lg
                focus:border-coral focus:ring-3 focus:ring-glow-coral outline-none transition-all"
            />
          </div>
          {error && <p className="text-[12px] text-coral">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={changePassword.isPending}
              className="px-5 py-2 text-[13px] font-medium text-white bg-coral rounded-lg
                hover:bg-coral-dark shadow-coral-btn transition-colors cursor-pointer disabled:opacity-50"
            >
              {changePassword.isPending ? 'Updating...' : 'Update Password'}
            </button>
            {saved && <span className="text-[12px] text-sage font-medium">Updated!</span>}
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="border-t border-border pt-6">
        <h3 className="text-[15px] font-serif font-semibold text-coral mb-2">Danger Zone</h3>
        <p className="text-[13px] text-ink-muted mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          className="px-5 py-2 text-[13px] font-medium text-coral border border-coral/30 rounded-lg
            hover:bg-coral/5 transition-colors cursor-pointer"
          onClick={() => alert('Account deletion is not yet implemented. Contact support.')}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}
