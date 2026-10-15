'use client';

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';

interface Client {
  id: string;
  name: string;
  status?: string;
  responsible?: string;
  [key: string]: unknown;
}

const STAGES = ['Exploration', 'MOU', 'Pilot', 'Onboarded', 'Active', 'Inactive'];

const STAGE_COLORS: Record<string, { bar: string; dot: string; count: string }> = {
  Exploration: { bar: 'bg-purple-500', dot: 'bg-purple-400', count: 'text-purple-300' },
  MOU: { bar: 'bg-blue-500', dot: 'bg-blue-400', count: 'text-blue-300' },
  Pilot: { bar: 'bg-amber-500', dot: 'bg-amber-400', count: 'text-amber-300' },
  Onboarded: { bar: 'bg-teal-500', dot: 'bg-teal-400', count: 'text-teal-300' },
  Active: { bar: 'bg-green-500', dot: 'bg-green-400', count: 'text-green-300' },
  Inactive: { bar: 'bg-gray-400', dot: 'bg-gray-300', count: 'text-gray-400' },
};

export default function PipelinePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    setLoading(true);
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch {
      console.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }

  const grouped = STAGES.map((stage) => ({
    stage,
    clients: clients.filter((c) => (c.status || 'Exploration') === stage),
  }));

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold text-[#153543] uppercase tracking-[0.15em]">Pipeline</h1>
          <span className="text-xs text-[#153543]/40 font-semibold">{clients.length} clients</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#49A3CC] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-[#49A3CC] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-[#49A3CC] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-3 min-w-max">
              {grouped.map(({ stage, clients: stageClients }) => {
                const colors = STAGE_COLORS[stage] || STAGE_COLORS.Inactive;
                return (
                  <div key={stage} className="w-60 shrink-0">
                    {/* Column header */}
                    <div className="bg-[#153543] text-white px-4 py-3 rounded-t-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                        <span className="text-xs font-semibold uppercase tracking-wider">{stage}</span>
                      </div>
                      <span className={`text-xs font-bold ${colors.count}`}>{stageClients.length}</span>
                    </div>

                    {/* Color accent bar */}
                    <div className={`h-0.5 ${colors.bar}`} />

                    {/* Cards */}
                    <div className="bg-white/50 border border-t-0 border-[#E5E7EB] rounded-b-xl p-2 min-h-[140px] space-y-2">
                      {stageClients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className="w-full text-left bg-white hover:bg-[#E2F0F6] rounded-lg p-3 transition-all shadow-sm hover:shadow-md border border-[#E5E7EB] hover:border-[#49A3CC]/30"
                        >
                          <p className="text-sm font-semibold text-[#153543] truncate">{client.name}</p>
                          {client.responsible && (
                            <p className="text-[11px] text-[#153543]/40 mt-1 font-medium">{client.responsible as string}</p>
                          )}
                        </button>
                      ))}
                      {stageClients.length === 0 && (
                        <div className="flex items-center justify-center py-8">
                          <p className="text-xs text-[#153543]/20 italic">No clients</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Client detail modal */}
        {selectedClient && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setSelectedClient(null)}>
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="bg-[#153543] text-white px-5 py-4 rounded-t-2xl flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-wider">{selectedClient.name}</h2>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-white/40 hover:text-white transition-colors w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5 space-y-3">
                {Object.entries(selectedClient).map(([key, val]) => {
                  if (key === 'id' || !val) return null;
                  return (
                    <div key={key} className="flex gap-3">
                      <span className="text-[10px] text-[#153543]/40 uppercase tracking-wider w-28 shrink-0 pt-0.5 font-semibold">
                        {key}
                      </span>
                      <span className="text-sm text-[#153543]">
                        {typeof val === 'string' ? val : JSON.stringify(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
