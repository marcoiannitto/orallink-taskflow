'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import NavBar from '@/components/NavBar';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function SettingsPage() {
  const { user, loading, hasPermission } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !hasPermission('admin'))) {
      router.push('/dashboard');
    }
  }, [loading, user, hasPermission, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F7F7F7]">
        <NavBar />
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#49A3CC] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!hasPermission('admin')) return null;

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-[#153543] mb-5">Settings</h1>

        <div className="bg-white rounded-xl border border-[#D1D5DB]/60 p-5">
          <h2 className="text-sm font-semibold text-[#153543] mb-3">Team Members</h2>
          <p className="text-xs text-[#153543]/50">
            Team management will be available here in a future update (FR-005).
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#D1D5DB]/60 p-5 mt-3">
          <h2 className="text-sm font-semibold text-[#153543] mb-3">Role Permissions</h2>
          <div className="space-y-2">
            {[
              { level: 'Admin', desc: 'Full access: settings, table setup, all actions', who: 'Glenn, Marco, Gerald' },
              { level: 'Member', desc: 'Create and update clients, tasks, view activity', who: 'Jeremy' },
              { level: 'Intern', desc: 'Create and update clients, tasks, view activity', who: 'Matthew, Yee Kai' },
            ].map((r) => (
              <div key={r.level} className="flex items-start gap-3 py-2 border-b border-[#D1D5DB]/30 last:border-0">
                <span className="text-xs font-semibold text-[#153543] w-16 shrink-0">{r.level}</span>
                <div className="flex-1">
                  <p className="text-xs text-[#153543]/70">{r.desc}</p>
                  <p className="text-[10px] text-[#153543]/40 mt-0.5">{r.who}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
