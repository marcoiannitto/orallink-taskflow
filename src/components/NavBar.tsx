'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type PermissionLevel = 'admin' | 'member' | 'intern';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  minPermission?: PermissionLevel;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Input', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { href: '/today', label: 'Today', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { href: '/tasks', label: 'Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { href: '/pipeline', label: 'Pipeline', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { href: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', minPermission: 'admin' },
];

const PERMISSION_RANK: Record<PermissionLevel, number> = {
  admin: 3,
  member: 2,
  intern: 1,
};

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string; permission: PermissionLevel } | null>(null);

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

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.minPermission) return true;
    if (!user) return false;
    return PERMISSION_RANK[user.permission || 'member'] >= PERMISSION_RANK[item.minPermission];
  });

  return (
    <>
      {/* Desktop / tablet top bar */}
      <nav className="bg-[#153543] text-white shadow-lg hidden sm:block">
        <div className="max-w-5xl mx-auto px-4 py-0 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 py-2">
              <Image src="/logo-white.png" alt="OralLink" width={140} height={40} className="h-8 w-auto" priority />
            </Link>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex gap-0.5">
              {visibleItems.map((item) => (
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

      {/* Mobile top bar (logo + user) */}
      <nav className="bg-[#153543] text-white shadow-lg sm:hidden">
        <div className="px-4 py-2.5 flex items-center justify-between">
          <Link href="/dashboard">
            <Image src="/logo-white.png" alt="OralLink" width={110} height={32} className="h-7 w-auto" priority />
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-[11px] font-medium text-white/70">{user.name}</span>
            )}
            <button
              onClick={handleLogout}
              className="text-[10px] text-white/40 hover:text-white/80 px-2 py-1 rounded border border-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#153543] border-t border-white/10 sm:hidden safe-area-bottom">
        <div className="flex justify-around px-1 pt-1.5 pb-2">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-0 ${
                pathname === item.href
                  ? 'text-[#49A3CC]'
                  : 'text-white/40 active:text-white/70'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="text-[9px] font-semibold uppercase tracking-wider leading-none">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
