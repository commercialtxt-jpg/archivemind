import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';
import type { AuthResponse } from '../types';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister
        ? { email, password, display_name: displayName }
        : { email, password };
      const { data } = await api.post<AuthResponse>(endpoint, body);
      login(data.token, data.user);
      navigate('/journal');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cream">
      <div className="w-full max-w-sm p-8 bg-warm-white rounded-xl border border-border shadow-card">
        <div className="flex items-center gap-2 mb-6">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white font-serif text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, var(--color-coral), var(--color-amber))' }}
          >
            A
          </div>
          <span className="font-serif text-lg font-semibold text-ink">ArchiveMind</span>
        </div>

        <h1 className="font-serif text-xl font-semibold text-ink mb-6">
          {isRegister ? 'Create account' : 'Sign in'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-parchment border border-border rounded-lg
                focus:bg-white focus:border-coral focus:ring-3 focus:ring-glow-coral outline-none"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-parchment border border-border rounded-lg
              focus:bg-white focus:border-coral focus:ring-3 focus:ring-glow-coral outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-parchment border border-border rounded-lg
              focus:bg-white focus:border-coral focus:ring-3 focus:ring-glow-coral outline-none"
          />

          {error && <p className="text-coral text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-coral text-white font-medium text-sm rounded-lg
              hover:bg-coral-light transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? '...' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          onClick={() => { setIsRegister(!isRegister); setError(''); }}
          className="mt-4 text-xs text-ink-muted hover:text-coral transition-colors cursor-pointer"
        >
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  );
}
