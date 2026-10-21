'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';

interface Task {
  id: string;
  task: string;
  responsible?: string;
  dueDate?: string;
  status?: string;
  priority?: string;
  type?: string;
  description?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((u) => setUserName(u.name))
      .catch(() => null);
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
      setIsAdmin(data.isAdmin || false);
    } catch {
      console.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }

  async function markDone(id: string) {
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'Done' }),
    });
    fetchTasks();
  }

  const isOverdue = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date() && new Date(date).toDateString() !== new Date().toDateString();
  };

  const filtered = tasks
    .filter((t) => {
      if (filter === 'mine' && t.responsible !== userName) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold text-[#153543] uppercase tracking-[0.15em]">Tasks</h1>
          <div className="flex gap-2">
            {isAdmin && (
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'mine')}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#D1D5DB] bg-white text-[#153543] font-semibold focus:outline-none focus:ring-2 focus:ring-[#49A3CC]"
              >
                <option value="all">All</option>
                <option value="mine">My Tasks</option>
              </select>
            )}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#D1D5DB] bg-white text-[#153543] font-semibold focus:outline-none focus:ring-2 focus:ring-[#49A3CC]"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#49A3CC] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-[#49A3CC] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-[#49A3CC] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#153543]/40 text-center py-16 italic">No tasks found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => (
              <div
                key={task.id}
                className={`bg-white rounded-xl border p-4 flex items-start gap-3 shadow-sm transition-all hover:shadow-md ${
                  isOverdue(task.dueDate) && task.status !== 'Done'
                    ? 'border-[#FF6F59]/50 bg-red-50/30'
                    : 'border-[#E5E7EB]'
                }`}
              >
                <button
                  onClick={() => markDone(task.id)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 transition-all ${
                    task.status === 'Done'
                      ? 'bg-[#49A3CC] border-[#49A3CC]'
                      : 'border-[#D1D5DB] hover:border-[#49A3CC] hover:bg-[#49A3CC]/10'
                  }`}
                >
                  {task.status === 'Done' && (
                    <svg className="w-3 h-3 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${task.status === 'Done' ? 'line-through text-[#153543]/30' : 'text-[#153543]'}`}>
                    {task.task}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {task.responsible && (
                      <span className="text-[11px] text-[#153543]/40 font-medium">{task.responsible}</span>
                    )}
                    {task.responsible && task.dueDate && <span className="text-[#D1D5DB]">·</span>}
                    {task.dueDate && (
                      <span className={`text-[11px] font-medium ${
                        isOverdue(task.dueDate) && task.status !== 'Done'
                          ? 'text-[#FF6F59]'
                          : 'text-[#153543]/40'
                      }`}>
                        {new Date(task.dueDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {task.priority && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        task.priority === 'High' ? 'bg-red-100 text-red-700' :
                        task.priority === 'Low' ? 'bg-green-100 text-green-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{task.priority}</span>
                    )}
                    {task.type && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E2F0F6] text-[#49A3CC] font-semibold">{task.type}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
