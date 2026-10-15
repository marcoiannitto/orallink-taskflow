'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Input' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/pipeline', label: 'Pipeline' },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => null);
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <nav className="bg-[#153543] text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-0 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 py-2">
            <Image
              src="/logo-white.png"
              alt="OralLink"
              width={140}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <div className="h-8 w-px bg-white/20" />
          <div className="flex gap-0.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                  pathname === item.href
                    ? 'border-[#49A3CC] text-white'
                    : 'border-transparent text-white/60 hover:text-white hover:border-white/30'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: User info + Logout */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="text-right">
              <p className="text-xs font-semibold text-white/90 leading-tight">{user.name}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider leading-tight">{user.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-white/40 hover:text-white/80 transition-colors px-3 py-1.5 rounded border border-white/10 hover:border-white/30"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
