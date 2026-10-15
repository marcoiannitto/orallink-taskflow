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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-[#153543] uppercase tracking-wider">Tasks</h1>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'mine')}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#D1D5DB] bg-white"
            >
              <option value="all">All</option>
              <option value="mine">My Tasks</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#D1D5DB] bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-[#153543]/50">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#153543]/50">No tasks found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => (
              <div
                key={task.id}
                className={`bg-white rounded-xl border p-4 flex items-start gap-3 ${
                  isOverdue(task.dueDate) && task.status !== 'Done'
                    ? 'border-[#FF6F59]'
                    : 'border-[#D1D5DB]'
                }`}
              >
                <button
                  onClick={() => markDone(task.id)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
                    task.status === 'Done'
                      ? 'bg-[#A3D9A5] border-[#A3D9A5]'
                      : 'border-[#D1D5DB] hover:border-[#49A3CC]'
                  }`}
                >
                  {task.status === 'Done' && (
                    <svg className="w-3 h-3 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === 'Done' ? 'line-through text-[#153543]/40' : ''}`}>
                    {task.task}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {task.responsible && (
                      <span className="text-xs text-[#153543]/50">{task.responsible}</span>
                    )}
                    {task.dueDate && (
                      <span className={`text-xs ${
                        isOverdue(task.dueDate) && task.status !== 'Done'
                          ? 'text-[#FF6F59] font-medium'
                          : 'text-[#153543]/50'
                      }`}>
                        {new Date(task.dueDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {task.priority && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        task.priority === 'High' ? 'bg-red-100 text-red-700' :
                        task.priority === 'Low' ? 'bg-green-100 text-green-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{task.priority}</span>
                    )}
                    {task.type && (
                      <span className="text-xs text-[#49A3CC]">{task.type}</span>
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
