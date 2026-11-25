'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';

interface Task {
  id: string;
  task: string;
  responsible?: string;
  dueDate?: string;
  status?: string;
  priority?: string;
}

interface Client {
  id: string;
  name: string;
  status?: string;
  responsible: string[];
  nextFollowUp?: string;
  notes?: string;
  contactName?: string;
}

interface TodayData {
  dueTasks: Task[];
  dueClients: Client[];
  upcomingTasks: Task[];
  upcomingClients: Client[];
  today: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
}

function daysOverdue(d: string, today: string) {
  const diff = Math.floor((new Date(today).getTime() - new Date(d).getTime()) / 86400000);
  if (diff <= 0) return null;
  return diff === 1 ? '1 day overdue' : `${diff} days overdue`;
}

export default function TodayPage() {
  const router = useRouter();
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/today')
      .then((r) => r.json())
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const overdueCount = (data?.dueTasks.length || 0) + (data?.dueClients.length || 0);
  const upcomingCount = (data?.upcomingTasks.length || 0) + (data?.upcomingClients.length || 0);

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <NavBar />
      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-6 pb-20 sm:pb-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold text-[#153543] uppercase tracking-[0.15em]">Today</h1>
          <span className="text-xs text-[#153543]/40 font-semibold">
            {data?.today ? formatDate(data.today) : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#49A3CC] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-[#49A3CC] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-[#49A3CC] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : !data ? (
          <p className="text-sm text-[#153543]/40 text-center py-16 italic">Failed to load.</p>
        ) : overdueCount === 0 && upcomingCount === 0 ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-3">&#10003;</div>
            <p className="text-sm text-[#153543]/40 italic">All clear. Nothing due.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Due / Overdue section */}
            {overdueCount > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#FF6F59]" />
                  <h2 className="text-xs font-bold text-[#FF6F59] uppercase tracking-wider">
                    Due / Overdue ({overdueCount})
                  </h2>
                </div>
                <div className="space-y-2">
                  {data.dueTasks.map((t) => (
                    <div key={`task-${t.id}`} onClick={() => router.push('/tasks')} className="bg-white rounded-xl border border-[#FF6F59]/30 p-3.5 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-5 h-5 rounded bg-[#FF6F59]/10 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-[#FF6F59]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#153543]">{t.task}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] px-2 py-0.5 bg-[#FF6F59]/10 text-[#FF6F59] rounded-full font-semibold uppercase">Task</span>
                            {t.responsible && <span className="text-[11px] text-[#153543]/40">{t.responsible}</span>}
                            {t.dueDate && (
                              <span className="text-[11px] text-[#FF6F59] font-medium">
                                {daysOverdue(t.dueDate, data.today) || 'Due today'}
                              </span>
                            )}
                            {t.priority === 'High' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-semibold">High</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.dueClients.map((c) => {
                    const lastNote = c.notes?.split('\n')[0]?.trim();
                    return (
                      <div key={`client-${c.id}`} onClick={() => router.push('/pipeline')} className="bg-white rounded-xl border border-[#FF6F59]/30 p-3.5 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 w-5 h-5 rounded bg-[#49A3CC]/10 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-[#49A3CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#153543]">{c.name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-[10px] px-2 py-0.5 bg-[#49A3CC]/10 text-[#49A3CC] rounded-full font-semibold uppercase">Follow-up</span>
                              {c.responsible?.length > 0 && (
                                <span className="text-[11px] text-[#153543]/40">{c.responsible.join(', ')}</span>
                              )}
                              {c.nextFollowUp && (
                                <span className="text-[11px] text-[#FF6F59] font-medium">
                                  {daysOverdue(c.nextFollowUp, data.today) || 'Due today'}
                                </span>
                              )}
                              {c.status && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-[#F3F4F6] text-[#153543]/50 rounded font-medium">{c.status}</span>
                              )}
                            </div>
                            {lastNote && (
                              <p className="text-[11px] text-[#153543]/40 mt-1.5 line-clamp-2">{lastNote}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Upcoming section */}
            {upcomingCount > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#49A3CC]" />
                  <h2 className="text-xs font-bold text-[#49A3CC] uppercase tracking-wider">
                    Coming up ({upcomingCount})
                  </h2>
                </div>
                <div className="space-y-2">
                  {data.upcomingTasks.map((t) => (
                    <div key={`task-${t.id}`} onClick={() => router.push('/tasks')} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-5 h-5 rounded bg-[#F3F4F6] flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-[#153543]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#153543]">{t.task}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] px-2 py-0.5 bg-[#F3F4F6] text-[#153543]/40 rounded-full font-semibold uppercase">Task</span>
                            {t.responsible && <span className="text-[11px] text-[#153543]/40">{t.responsible}</span>}
                            {t.dueDate && <span className="text-[11px] text-[#153543]/40">{formatDate(t.dueDate)}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.upcomingClients.map((c) => (
                    <div key={`client-${c.id}`} onClick={() => router.push('/pipeline')} className="bg-white rounded-xl border border-[#E5E7EB] p-3.5 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-5 h-5 rounded bg-[#F3F4F6] flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-[#153543]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#153543]">{c.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] px-2 py-0.5 bg-[#F3F4F6] text-[#153543]/40 rounded-full font-semibold uppercase">Follow-up</span>
                            {c.responsible?.length > 0 && <span className="text-[11px] text-[#153543]/40">{c.responsible.join(', ')}</span>}
                            {c.nextFollowUp && <span className="text-[11px] text-[#153543]/40">{formatDate(c.nextFollowUp)}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
