'use client';

import { useState, useRef, useEffect } from 'react';
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
  notify: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  parsed?: ParsedResult;
  aiRawText?: string;
}

export default function DashboardPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingParsed, setPendingParsed] = useState<ParsedResult | null>(null);
  const [sourceInput, setSourceInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<ParsedResult | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingParsed]);

  // Build history for multi-turn AI conversation
  function buildHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return messages.map((m) => ({
      role: m.role,
      content: m.role === 'assistant' ? (m.aiRawText || m.content) : m.content,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setLoading(true);

    // Add user message to chat
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: userMsg, history: buildHistory() }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages([...newMessages, {
          role: 'assistant',
          content: `Something went wrong: ${data.error}${data.raw ? ' (' + data.raw.slice(0, 100) + ')' : ''}`,
        }]);
      } else {
        const parsed = data.parsed as ParsedResult;
        const aiRawText = data.aiRawText || '';

        if (parsed.clarification_needed) {
          // AI needs more info, show as chat message, user can reply
          setMessages([...newMessages, {
            role: 'assistant',
            content: parsed.clarification_needed,
            parsed,
            aiRawText,
          }]);
        } else {
          // AI has a result, show summary in chat + confirmation card
          const intentLabel = parsed.intent.replace(/_/g, ' ');
          const summary = parsed.intent.includes('client')
            ? `Got it. I'll ${intentLabel}: **${parsed.client_name || parsed.title}** (${parsed.status_update || 'Exploration'}). Please review and confirm below.`
            : `Got it. I'll ${intentLabel}: **${parsed.title}** assigned to ${parsed.assigned_to}. Please review and confirm below.`;

          setMessages([...newMessages, {
            role: 'assistant',
            content: summary,
            parsed,
            aiRawText,
          }]);
          setPendingParsed(parsed);
          setEditData(parsed);
          setSourceInput(data.sourceInput);
        }
      }
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Failed to process input. Please try again.',
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed: editing ? editData : pendingParsed, sourceInput }),
      });
      const data = await res.json();
      if (data.ok) {
        const resultText = data.results?.join(', ') || 'Done';
        setMessages((prev) => [...prev, { role: 'assistant', content: `Done! ${resultText}.` }]);
        setPendingParsed(null);
        setEditData(null);
        setEditing(false);
        setToast('Saved!');
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
    setPendingParsed(null);
    setEditData(null);
    setEditing(false);
    setMessages((prev) => [...prev, { role: 'assistant', content: 'Discarded. What else?' }]);
  }

  const displayData = editing ? editData : pendingParsed;

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col">
      <NavBar />
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4">
        {/* Chat messages */}
        <div className="flex-1 py-6 space-y-4 overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <h1 className="text-xl font-bold text-[#153543] uppercase tracking-wider mb-2">
                TaskFlow
              </h1>
              <p className="text-sm text-[#153543]/50">
                Tell me what needs to happen. I'll figure out the rest.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#153543] text-white rounded-br-md'
                    : 'bg-white border border-[#D1D5DB] text-[#153543] rounded-bl-md'
                }`}
              >
                {msg.content.split('**').map((part, j) =>
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
                )}
              </div>
            </div>
          ))}

          {/* Confirmation card inline in chat */}
          {pendingParsed && displayData && (
            <div className="flex justify-start">
              <div className="max-w-[90%] w-full">
                <div className="bg-white rounded-xl border border-[#D1D5DB] overflow-hidden">
                  <div className="bg-[#153543] px-4 py-2.5">
                    <span className="text-xs text-white/60 uppercase tracking-wider">
                      {displayData.intent?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    {editing ? (
                      <EditFields data={editData!} setData={setEditData} />
                    ) : (
                      <ViewFields data={displayData} />
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
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#D1D5DB] rounded-2xl rounded-bl-md px-4 py-2.5">
                <span className="text-sm text-[#153543]/50 animate-pulse">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input bar, fixed at bottom */}
        <div className="sticky bottom-0 bg-[#F7F7F7] pb-4 pt-2">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              className="flex-1 px-4 py-3 rounded-xl border border-[#D1D5DB] bg-white text-[#153543] text-sm focus:outline-none focus:ring-2 focus:ring-[#49A3CC] resize-none"
              rows={1}
              placeholder={messages.length === 0
                ? 'e.g. Set up a meeting with Asia Medic before Oct 20. Tell Glenn and Marco.'
                : 'Reply...'
              }
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-3 bg-[#FF6F59] text-white font-semibold rounded-xl text-sm hover:bg-[#e5634f] transition-colors disabled:opacity-50"
            >
              ↑
            </button>
          </form>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#153543] text-white px-6 py-3 rounded-xl text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function ViewFields({ data }: { data: ParsedResult }) {
  if (data.intent === 'create_client' || data.intent === 'update_client') {
    return (
      <>
        <Field label="Client"><span className="text-sm font-medium text-[#153543]">{data.client_name}</span></Field>
        {data.contact_name && <Field label="Contact"><span className="text-sm text-[#153543]">{data.contact_name}</span></Field>}
        {data.contact_email && <Field label="Email"><span className="text-sm text-[#153543]">{data.contact_email}</span></Field>}
        <Field label="Status">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
            {data.status_update || 'Exploration'}
          </span>
        </Field>
        {data.due_date && <Field label="Follow-up"><span className="text-sm text-[#153543]">{data.due_date}</span></Field>}
        <Field label="Assigned to"><span className="text-sm text-[#153543]">{data.assigned_to}</span></Field>
        {(data.notes_append || data.description) && (
          <Field label="Notes"><span className="text-sm text-[#153543]/70">{data.notes_append || data.description}</span></Field>
        )}
        {data.notify && data.notify.length > 0 && (
          <Field label="Notify"><span className="text-sm text-[#153543]">{data.notify.join(', ')}</span></Field>
        )}
      </>
    );
  }
  return (
    <>
      <Field label="Title"><span className="text-sm font-medium text-[#153543]">{data.title}</span></Field>
      {data.client_name && <Field label="Client"><span className="text-sm text-[#153543]">{data.client_name}</span></Field>}
      <Field label="Assigned to"><span className="text-sm text-[#153543]">{data.assigned_to}</span></Field>
      {data.due_date && <Field label="Due date"><span className="text-sm text-[#153543]">{data.due_date}</span></Field>}
      <Field label="Priority">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          data.priority === 'High' ? 'bg-red-100 text-red-700' :
          data.priority === 'Low' ? 'bg-green-100 text-green-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>{data.priority}</span>
      </Field>
      <Field label="Type"><span className="text-sm text-[#153543]">{data.type}</span></Field>
      {data.description && <Field label="Description"><span className="text-sm text-[#153543]/70">{data.description}</span></Field>}
    </>
  );
}

function EditFields({ data, setData }: { data: ParsedResult; setData: (d: ParsedResult) => void }) {
  if (data.intent === 'create_client' || data.intent === 'update_client') {
    return (
      <>
        <Field label="Client name">
          <input value={data.client_name || ''} onChange={(e) => setData({ ...data, client_name: e.target.value })}
            className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]" />
        </Field>
        <Field label="Contact">
          <input value={data.contact_name || ''} onChange={(e) => setData({ ...data, contact_name: e.target.value })}
            className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]" />
        </Field>
        <Field label="Email">
          <input value={data.contact_email || ''} onChange={(e) => setData({ ...data, contact_email: e.target.value })}
            className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]" />
        </Field>
        <Field label="Status">
          <select value={data.status_update || 'Exploration'} onChange={(e) => setData({ ...data, status_update: e.target.value })}
            className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]">
            <option>Exploration</option><option>MOU</option><option>Pilot</option>
            <option>Onboarded</option><option>Active</option><option>Inactive</option>
          </select>
        </Field>
        <Field label="Follow-up">
          <input type="date" value={data.due_date || ''} onChange={(e) => setData({ ...data, due_date: e.target.value })}
            className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]" />
        </Field>
        <Field label="Assigned to">
          <input value={data.assigned_to || ''} onChange={(e) => setData({ ...data, assigned_to: e.target.value })}
            className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]" />
        </Field>
        <Field label="Notes">
          <textarea value={data.notes_append || data.description || ''} onChange={(e) => setData({ ...data, notes_append: e.target.value })}
            className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543] resize-none" rows={2} />
        </Field>
      </>
    );
  }
  return (
    <>
      <Field label="Title">
        <input value={data.title || ''} onChange={(e) => setData({ ...data, title: e.target.value })}
          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]" />
      </Field>
      <Field label="Assigned to">
        <input value={data.assigned_to || ''} onChange={(e) => setData({ ...data, assigned_to: e.target.value })}
          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]" />
      </Field>
      <Field label="Due date">
        <input type="date" value={data.due_date || ''} onChange={(e) => setData({ ...data, due_date: e.target.value })}
          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]" />
      </Field>
      <Field label="Priority">
        <select value={data.priority || 'Medium'} onChange={(e) => setData({ ...data, priority: e.target.value })}
          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]">
          <option>High</option><option>Medium</option><option>Low</option>
        </select>
      </Field>
      <Field label="Type">
        <select value={data.type || 'To-do'} onChange={(e) => setData({ ...data, type: e.target.value })}
          className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-sm text-[#153543]">
          <option>CRM Follow-up</option><option>Reminder</option><option>To-do</option><option>Other</option>
        </select>
      </Field>
    </>
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
