'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';

interface ActivityEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entityName: string;
  details: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  create_client: { label: 'New Client', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  update_client: { label: 'Updated Client', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  create_task: { label: 'New Task', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
};

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [setupNeeded, setSetupNeeded] = useState(false);

  useEffect(() => {
    fetchActivity();
  }, [filterUser, filterAction]);

  async function fetchActivity() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterUser) params.set('user', filterUser);
      if (filterAction) params.set('action', filterAction);

      const res = await fetch(`/api/activity?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      if (data.entries.length === 0 && !filterUser && !filterAction) {
        // Could be that the table isn't set up yet
        setSetupNeeded(true);
      } else {
        setSetupNeeded(false);
      }

      setEntries(data.entries);
      setTeamNames(data.teamNames || []);
    } catch {
      setError('Could not load activity log');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup() {
    setLoading(true);
    try {
      const res = await fetch('/api/activity/setup', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.tableId) {
        setError(null);
        setSetupNeeded(false);
        alert(
          `Activity Log table created!\n\nTable ID: ${data.tableId}\n\nAdd this to your Vercel environment variables:\nAIRTABLE_ACTIVITY_TABLE_ID = ${data.tableId}\n\nThen redeploy.`
        );
      } else {
        setError(data.message || 'Setup failed');
      }
    } catch {
      setError('Setup request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <NavBar />

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold text-[#153543]">Activity Log</h1>
          <p className="text-xs text-[#153543]/40">Last 50 actions</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#D1D5DB] bg-white text-[#153543] focus:outline-none focus:ring-1 focus:ring-[#49A3CC]"
          >
            <option value="">All users</option>
            {teamNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#D1D5DB] bg-white text-[#153543] focus:outline-none focus:ring-1 focus:ring-[#49A3CC]"
          >
            <option value="">All actions</option>
            <option value="create_client">New Client</option>
            <option value="update_client">Updated Client</option>
            <option value="create_task">New Task</option>
          </select>
        </div>

        {/* Setup prompt */}
        {setupNeeded && !loading && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-amber-800 mb-2">
              Activity logging needs a table in Airtable. You can set it up automatically or create it manually.
            </p>
            <button
              onClick={handleSetup}
              className="text-xs font-semibold text-white bg-[#153543] px-4 py-2 rounded-lg hover:bg-[#153543]/90 transition-colors"
            >
              Create Activity Log Table
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#49A3CC] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Activity list */}
        {!loading && entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((entry) => {
              const actionMeta = ACTION_LABELS[entry.action] || {
                label: entry.action,
                color: 'text-gray-700',
                bg: 'bg-gray-50 border-gray-200',
              };
              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-xl border border-[#D1D5DB]/60 px-4 py-3 flex items-start gap-3"
                >
                  {/* Action badge */}
                  <span
                    className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${actionMeta.bg} ${actionMeta.color}`}
                  >
                    {actionMeta.label}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#153543] truncate">
                      {entry.entityName}
                    </p>
                    {entry.details && (
                      <p className="text-xs text-[#153543]/50 mt-0.5 truncate">
                        {entry.details}
                      </p>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold text-[#49A3CC]">{entry.user}</p>
                    <p className="text-[10px] text-[#153543]/30" title={formatTimestamp(entry.timestamp)}>
                      {formatRelativeTime(entry.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && entries.length === 0 && !setupNeeded && !error && (
          <div className="text-center py-16">
            <p className="text-sm text-[#153543]/40">No activity recorded yet</p>
            <p className="text-xs text-[#153543]/25 mt-1">
              Actions will appear here as you use TaskFlow
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
