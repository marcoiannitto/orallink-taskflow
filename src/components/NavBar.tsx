'use client';

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
    <nav className="bg-[#153543] text-white px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold uppercase tracking-widest">TaskFlow</span>
          <div className="flex gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-colors ${
                  pathname === item.href
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-xs text-white/60">
              {user.name} ({user.role})
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-white/40 hover:text-white/80 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
