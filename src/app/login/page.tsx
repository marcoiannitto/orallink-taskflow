'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setError('Invalid email or password');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#E2F0F6] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#153543] tracking-wide uppercase"
              style={{ fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif' }}>
            ORAL LINK
          </h1>
          <p className="text-sm text-[#153543]/60 mt-1 uppercase tracking-widest"
             style={{ fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif' }}>
            TaskFlow
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-lg font-semibold text-[#153543] mb-6 uppercase tracking-wide"
              style={{ fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif' }}>
            Sign In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[#153543]/60 uppercase tracking-wider mb-1"
                     style={{ fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[#D1D5DB] bg-[#F7F7F7] text-[#153543] text-sm focus:outline-none focus:ring-2 focus:ring-[#49A3CC] focus:border-transparent"
                placeholder="you@orallink.health"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-[#153543]/60 uppercase tracking-wider mb-1"
                     style={{ fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[#D1D5DB] bg-[#F7F7F7] text-[#153543] text-sm focus:outline-none focus:ring-2 focus:ring-[#49A3CC] focus:border-transparent"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-[#FF6F59]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#FF6F59] text-white font-semibold rounded-lg uppercase tracking-wider text-sm hover:bg-[#e5634f] transition-colors disabled:opacity-50"
              style={{ fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
