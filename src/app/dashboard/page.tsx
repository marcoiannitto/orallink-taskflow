'use client';

import { useState } from 'react';
import NavBar from '@/components/NavBar';

interface ParsedResult {
  intent: string;
  client_match: string | null;
  client_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  client_type: string | null;
  title: string;
  assigned_to: string;
  due_date: string | null;
  priority: string;
  type: string;
  status_update: string | null;
  notes_append: string | null;
  description: string;
  clarification_needed: string | null;
}

export default function DashboardPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [sourceInput, setSourceInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<ParsedResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setParsed(null);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (data.error) {
        setToast(data.error + (data.raw ? ': ' + data.raw.slice(0, 200) : ''));
        setTimeout(() => setToast(''), 8000);
      } else {
        setParsed(data.parsed);
        setEditData(data.parsed);
        setSourceInput(data.sourceInput);
      }
    } catch {
      setToast('Failed to process input');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed: editing ? editData : parsed, sourceInput }),
      });
      const data = await res.json();
      if (data.ok) {
        setToast('Saved!');
        setParsed(null);
        setEditData(null);
        setEditing(false);
        setInput('');
      } else {
        setToast(data.error || 'Failed to save');
      }
    } catch {
      setToast('Failed to save');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 3000);
    }
  }

  function handleDiscard() {
    setParsed(null);
    setEditData(null);
    setEditing(false);
  }

  const displayData = editing ? editData : parsed;

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-[#153543] uppercase tracking-wider mb-6">
          What needs to happen?
        </h1>

        {/* Input */}
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#D1D5DB] bg-white text-[#153543] text-sm focus:outline-none focus:ring-2 focus:ring-[#49A3CC] resize-none"
            rows={3}
            placeholder="e.g. Follow up with Dr Tan next Friday about the pilot. Remind Jeremy to send the contract by Wednesday."
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="mt-3 w-full py-3 bg-[#FF6F59] text-white font-semibold rounded-xl uppercase tracking-wider text-sm hover:bg-[#e5634f] transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Parse with AI'}
          </button>
        </form>

        {/* Clarification */}
        {displayData?.clarification_needed && (
          <div className="bg-[#E2F0F6] border border-[#49A3CC] rounded-xl p-4 mb-4">
            <p className="text-sm text-[#153543] font-medium">AI needs clarification:</p>
            <p className="text-sm text-[#153543]/80 mt-1">{displayData.clarification_needed}</p>
          </div>
        )}

        {/* Parsed result card */}
        {displayData && !displayData.clarification_needed && (
          <div className="bg-white rounded-xl border border-[#D1D5DB] overflow-hidden">
            <div className="bg-[#153543] px-4 py-3">
              <span className="text-xs text-white/60 uppercase tracking-wider">
                {displayData.intent?.replace('_', ' ')}
              </span>
            </div>

            <div className="p-4 space-y-3">
              {editing ? (
                <>
                  {displayData.intent === 'create_client' || displayData.intent === 'update_client' ? (
                    <>
                      <Field label="Client name">
                        <input
                          value={editData?.client_name || ''}
                          onChange={(e) => setEditData({ ...editData!, client_name: e.target.value })}
                          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]"
                        />
                      </Field>
                      <Field label="Contact">
                        <input
                          value={editData?.contact_name || ''}
                          onChange={(e) => setEditData({ ...editData!, contact_name: e.target.value })}
                          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]"
                        />
                      </Field>
                      <Field label="Email">
                        <input
                          value={editData?.contact_email || ''}
                          onChange={(e) => setEditData({ ...editData!, contact_email: e.target.value })}
                          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]"
                        />
                      </Field>
                      <Field label="Status">
                        <select
                          value={editData?.status_update || 'Exploration'}
                          onChange={(e) => setEditData({ ...editData!, status_update: e.target.value })}
                          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]"
                        >
                          <option>Exploration</option>
                          <option>MOU</option>
                          <option>Pilot</option>
                          <option>Onboarded</option>
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                      </Field>
                      <Field label="Follow-up">
                        <input
                          type="date"
                          value={editData?.due_date || ''}
                          onChange={(e) => setEditData({ ...editData!, due_date: e.target.value })}
                          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]"
                        />
                      </Field>
                      <Field label="Assigned to">
                        <input
                          value={editData?.assigned_to || ''}
                          onChange={(e) => setEditData({ ...editData!, assigned_to: e.target.value })}
                          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]"
                        />
                      </Field>
                      <Field label="Notes">
                        <textarea
                          value={editData?.notes_append || editData?.description || ''}
                          onChange={(e) => setEditData({ ...editData!, notes_append: e.target.value })}
                          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543] resize-none"
                          rows={2}
                        />
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label="Title">
                        <input
                          value={editData?.title || ''}
                          onChange={(e) => setEditData({ ...editData!, title: e.target.value })}
                          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]"
                        />
                      </Field>
                      <Field label="Assigned to">
                        <input
                          value={editData?.assigned_to || ''}
                          onChange={(e) => setEditData({ ...editData!, assigned_to: e.target.value })}
                          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]"
                        />
                      </Field>
                      <Field label="Due date">
                        <input
                          type="date"
                          value={editData?.due_date || ''}
                          onChange={(e) => setEditData({ ...editData!, due_date: e.target.value })}
                          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]"
                        />
                      </Field>
                      <Field label="Priority">
                        <select
                          value={editData?.priority || 'Medium'}
                          onChange={(e) => setEditData({ ...editData!, priority: e.target.value })}
                          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]"
                        >
                          <option>High</option>
                          <option>Medium</option>
                          <option>Low</option>
                        </select>
                      </Field>
                      <Field label="Type">
                        <select
                          value={editData?.type || 'To-do'}
                          onChange={(e) => setEditData({ ...editData!, type: e.target.value })}
                          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]"
                        >
                          <option>CRM Follow-up</option>
                          <option>Reminder</option>
                          <option>To-do</option>
                          <option>Other</option>
                        </select>
                      </Field>
                    </>
                  )}
                </>
              ) : (
                <>
                  {displayData.intent === 'create_client' || displayData.intent === 'update_client' ? (
                    <>
                      <Field label="Client"><span className="text-sm font-medium text-[#153543]">{displayData.client_name}</span></Field>
                      {displayData.contact_name && <Field label="Contact"><span className="text-sm text-[#153543]">{displayData.contact_name}</span></Field>}
                      {displayData.contact_email && <Field label="Email"><span className="text-sm text-[#153543]">{displayData.contact_email}</span></Field>}
                      <Field label="Status">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                          {displayData.status_update || 'Exploration'}
                        </span>
                      </Field>
                      {displayData.due_date && <Field label="Follow-up"><span className="text-sm text-[#153543]">{displayData.due_date}</span></Field>}
                      <Field label="Assigned to"><span className="text-sm text-[#153543]">{displayData.assigned_to}</span></Field>
                      {(displayData.notes_append || displayData.description) && (
                        <Field label="Notes"><span className="text-sm text-[#153543]/70">{displayData.notes_append || displayData.description}</span></Field>
                      )}
                    </>
                  ) : (
                    <>
                      <Field label="Title"><span className="text-sm font-medium text-[#153543]">{displayData.title}</span></Field>
                      {displayData.client_name && <Field label="Client"><span className="text-sm text-[#153543]">{displayData.client_name}</span></Field>}
                      <Field label="Assigned to"><span className="text-sm text-[#153543]">{displayData.assigned_to}</span></Field>
                      {displayData.due_date && <Field label="Due date"><span className="text-sm text-[#153543]">{displayData.due_date}</span></Field>}
                      <Field label="Priority">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          displayData.priority === 'High' ? 'bg-red-100 text-red-700' :
                          displayData.priority === 'Low' ? 'bg-green-100 text-green-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{displayData.priority}</span>
                      </Field>
                      <Field label="Type"><span className="text-sm text-[#153543]">{displayData.type}</span></Field>
                      {displayData.description && <Field label="Description"><span className="text-sm text-[#153543]/70">{displayData.description}</span></Field>}
                    </>
                  )}
                </>
              )}
            </div>

            <div className="px-4 py-3 bg-[#F7F7F7] flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="flex-1 py-2 bg-[#A3D9A5] text-[#153543] font-semibold rounded-lg text-sm uppercase tracking-wider hover:bg-[#8fcc91] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Confirm'}
              </button>
              <button
                onClick={() => setEditing(!editing)}
                className="px-4 py-2 border border-[#D1D5DB] text-[#153543] rounded-lg text-sm uppercase tracking-wider hover:bg-white transition-colors"
              >
                {editing ? 'Preview' : 'Edit'}
              </button>
              <button
                onClick={handleDiscard}
                className="px-4 py-2 text-[#FF6F59] text-sm uppercase tracking-wider hover:bg-red-50 rounded-lg transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#153543] text-white px-6 py-3 rounded-xl text-sm shadow-lg">
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-[#153543]/50 uppercase tracking-wider w-24 pt-0.5 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
