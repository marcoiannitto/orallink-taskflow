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

const STAGES = ['Prospect', 'Contacted', 'Meeting Set', 'Pilot', 'Negotiation', 'Signed'];

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
    clients: clients.filter((c) => (c.status || 'Prospect') === stage),
  }));

  // Also collect clients with statuses not in STAGES
  const otherClients = clients.filter(
    (c) => c.status && !STAGES.includes(c.status)
  );

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-[#153543] uppercase tracking-wider mb-4">Pipeline</h1>

        {loading ? (
          <p className="text-sm text-[#153543]/50">Loading...</p>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max">
              {grouped.map(({ stage, clients: stageClients }) => (
                <div key={stage} className="w-56 shrink-0">
                  <div className="bg-[#153543] text-white px-3 py-2 rounded-t-xl">
                    <span className="text-xs uppercase tracking-wider">{stage}</span>
                    <span className="text-xs text-white/50 ml-2">{stageClients.length}</span>
                  </div>
                  <div className="bg-white border border-t-0 border-[#D1D5DB] rounded-b-xl p-2 min-h-[120px] space-y-2">
                    {stageClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className="w-full text-left bg-[#F7F7F7] hover:bg-[#E2F0F6] rounded-lg p-2.5 transition-colors"
                      >
                        <p className="text-sm font-medium text-[#153543] truncate">{client.name}</p>
                        {client.responsible && (
                          <p className="text-xs text-[#153543]/50 mt-0.5">{client.responsible as string}</p>
                        )}
                      </button>
                    ))}
                    {stageClients.length === 0 && (
                      <p className="text-xs text-[#153543]/30 text-center py-4">No clients</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Client detail modal */}
        {selectedClient && (
          <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="bg-[#153543] text-white px-5 py-4 rounded-t-2xl flex justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-wider">{selectedClient.name}</h2>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-white/60 hover:text-white text-lg"
                >
                  x
                </button>
              </div>
              <div className="p-5 space-y-3">
                {Object.entries(selectedClient).map(([key, val]) => {
                  if (key === 'id' || !val) return null;
                  return (
                    <div key={key} className="flex gap-3">
                      <span className="text-xs text-[#153543]/50 uppercase tracking-wider w-28 shrink-0 pt-0.5">
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
