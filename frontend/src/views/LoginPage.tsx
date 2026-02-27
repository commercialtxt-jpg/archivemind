import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated } = useAuthStore();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already logged in — send to the page they came from, or /journal
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/journal';
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, displayName);
      } else {
        await login(email, password);
      }
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Something went wrong. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-cream px-4">
      <div className="w-full max-w-sm p-8 bg-warm-white rounded-xl border border-border shadow-card">
        {/* Branding */}
        <div className="flex items-center mb-6">
          <span className="font-serif text-xl font-semibold tracking-tight">
            <span className="text-coral">Archive</span><span className="text-ink">Mind</span>
          </span>
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
              required
              className="w-full px-3 py-2 text-base bg-parchment border border-border rounded-lg
                focus:bg-white focus:border-coral focus:ring-3 focus:ring-glow-coral outline-none"
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-3 py-2 text-base bg-parchment border border-border rounded-lg
              focus:bg-white focus:border-coral focus:ring-3 focus:ring-glow-coral outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            className="w-full px-3 py-2 text-base bg-parchment border border-border rounded-lg
              focus:bg-white focus:border-coral focus:ring-3 focus:ring-glow-coral outline-none"
          />

          {error && (
            <p className="text-coral text-xs bg-coral/10 px-3 py-2 rounded-md">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-coral text-white font-medium text-base rounded-lg
              hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {/* Seed credentials hint in development */}
        {import.meta.env.DEV && !isRegister && (
          <p className="mt-4 text-xs text-ink-ghost text-center">
            Demo: researcher@archivemind.dev / password123
          </p>
        )}

        <button
          type="button"
          onClick={() => { setIsRegister(!isRegister); setError(''); }}
          className="mt-4 w-full text-xs text-ink-muted hover:text-coral transition-colors cursor-pointer"
        >
          {isRegister
            ? 'Already have an account? Sign in'
            : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  );
}
