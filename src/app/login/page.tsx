'use client';

import Image from 'next/image';
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
    <div className="min-h-screen bg-[#153543] flex items-center justify-center px-4">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #49A3CC 1px, transparent 1px), radial-gradient(circle at 75% 75%, #49A3CC 1px, transparent 1px)', backgroundSize: '48px 48px' }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <Image
            src="/logo-white.png"
            alt="OralLink"
            width={280}
            height={80}
            className="mx-auto h-14 w-auto mb-4"
            priority
          />
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-12 bg-white/20" />
            <span className="text-xs text-white/50 uppercase tracking-[0.3em] font-semibold">
              TaskFlow
            </span>
            <div className="h-px w-12 bg-white/20" />
          </div>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-base font-bold text-[#153543] mb-6 uppercase tracking-wider">
            Sign In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] text-[#153543]/50 uppercase tracking-wider mb-1.5 font-semibold">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[#D1D5DB] bg-[#F7F7F7] text-[#153543] text-sm focus:outline-none focus:ring-2 focus:ring-[#49A3CC] focus:border-transparent transition-shadow"
                placeholder="you@orallink.health"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#153543]/50 uppercase tracking-wider mb-1.5 font-semibold">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[#D1D5DB] bg-[#F7F7F7] text-[#153543] text-sm focus:outline-none focus:ring-2 focus:ring-[#49A3CC] focus:border-transparent transition-shadow"
                placeholder="Enter password"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-[#FF6F59] bg-red-50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#49A3CC] text-white font-bold rounded-lg uppercase tracking-wider text-sm hover:bg-[#3d8fb5] transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-white/30 mt-8 uppercase tracking-wider">
          Powered by Kells
        </p>
      </div>
    </div>
  );
}
