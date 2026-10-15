'use client';

import Image from 'next/image';
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
          setMessages([...newMessages, {
            role: 'assistant',
            content: parsed.clarification_needed,
            parsed,
            aiRawText,
          }]);
        } else {
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
            <div className="text-center py-20">
              <Image
                src="/logo-tooth.png"
                alt=""
                width={64}
                height={64}
                className="mx-auto h-14 w-14 opacity-20 mb-6"
              />
              <h1 className="text-lg font-bold text-[#153543] uppercase tracking-[0.2em] mb-2">
                TaskFlow
              </h1>
              <p className="text-sm text-[#153543]/40 max-w-xs mx-auto">
                Tell me what needs to happen. I&apos;ll figure out the rest.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#153543] flex items-center justify-center shrink-0 mr-2 mt-1">
                  <Image src="/logo-tooth.png" alt="" width={16} height={16} className="w-4 h-4 opacity-80" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#153543] text-white rounded-br-md shadow-sm'
                    : 'bg-white border border-[#E5E7EB] text-[#153543] rounded-bl-md shadow-sm'
                }`}
              >
                {msg.content.split('**').map((part, j) =>
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
                )}
              </div>
            </div>
          ))}

          {/* Confirmation card */}
          {pendingParsed && displayData && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-[#153543] flex items-center justify-center shrink-0 mr-2 mt-1">
                <Image src="/logo-tooth.png" alt="" width={16} height={16} className="w-4 h-4 opacity-80" />
              </div>
              <div className="max-w-[85%] w-full">
                <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden shadow-sm">
                  <div className="bg-[#153543] px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[10px] text-white/50 uppercase tracking-[0.15em] font-semibold">
                      {displayData.intent?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-[#49A3CC] uppercase tracking-wider font-semibold">
                      Review
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    {editing ? (
                      <EditFields data={editData!} setData={setEditData} />
                    ) : (
                      <ViewFields data={displayData} />
                    )}
                  </div>

                  <div className="px-4 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB] flex gap-2">
                    <button
                      onClick={handleConfirm}
                      disabled={saving}
                      className="flex-1 py-2 bg-[#49A3CC] text-white font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-[#3d8fb5] transition-all disabled:opacity-50 shadow-sm"
                    >
                      {saving ? 'Saving...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setEditing(!editing)}
                      className="px-4 py-2 border border-[#D1D5DB] text-[#153543] rounded-lg text-xs uppercase tracking-wider font-semibold hover:bg-white hover:border-[#153543]/30 transition-all"
                    >
                      {editing ? 'Preview' : 'Edit'}
                    </button>
                    <button
                      onClick={handleDiscard}
                      className="px-4 py-2 text-[#FF6F59] text-xs uppercase tracking-wider font-semibold hover:bg-red-50 rounded-lg transition-colors"
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
              <div className="w-7 h-7 rounded-full bg-[#153543] flex items-center justify-center shrink-0 mr-2 mt-1">
                <Image src="/logo-tooth.png" alt="" width={16} height={16} className="w-4 h-4 opacity-80" />
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#49A3CC] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#49A3CC] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#49A3CC] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input bar */}
        <div className="sticky bottom-0 bg-gradient-to-t from-[#F7F7F7] via-[#F7F7F7] to-transparent pb-4 pt-4">
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
              className="flex-1 px-4 py-3 rounded-xl border border-[#D1D5DB] bg-white text-[#153543] text-sm focus:outline-none focus:ring-2 focus:ring-[#49A3CC] focus:border-transparent shadow-sm transition-shadow resize-none"
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
              className="w-11 h-11 bg-[#49A3CC] text-white font-bold rounded-xl text-sm hover:bg-[#3d8fb5] transition-all disabled:opacity-30 shadow-sm flex items-center justify-center shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#153543] text-white px-6 py-3 rounded-xl text-sm shadow-xl z-50 flex items-center gap-2">
          <svg className="w-4 h-4 text-[#A3D9A5]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
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
        <Field label="Client"><span className="text-sm font-semibold text-[#153543]">{data.client_name}</span></Field>
        {data.contact_name && <Field label="Contact"><span className="text-sm text-[#153543]">{data.contact_name}</span></Field>}
        {data.contact_email && <Field label="Email"><span className="text-sm text-[#153543]">{data.contact_email}</span></Field>}
        <Field label="Status">
          <StatusBadge status={data.status_update || 'Exploration'} />
        </Field>
        {data.due_date && <Field label="Follow-up"><span className="text-sm text-[#153543]">{data.due_date}</span></Field>}
        <Field label="Assigned to"><span className="text-sm text-[#153543]">{data.assigned_to}</span></Field>
        {(data.notes_append || data.description) && (
          <Field label="Notes"><span className="text-sm text-[#153543]/60 italic">{data.notes_append || data.description}</span></Field>
        )}
        {data.notify && data.notify.length > 0 && (
          <Field label="Notify">
            <div className="flex flex-wrap gap-1">
              {data.notify.map((n) => (
                <span key={n} className="text-xs px-2 py-0.5 bg-[#E2F0F6] text-[#153543] rounded-full font-medium">{n}</span>
              ))}
            </div>
          </Field>
        )}
      </>
    );
  }
  return (
    <>
      <Field label="Title"><span className="text-sm font-semibold text-[#153543]">{data.title}</span></Field>
      {data.client_name && <Field label="Client"><span className="text-sm text-[#153543]">{data.client_name}</span></Field>}
      <Field label="Assigned to"><span className="text-sm text-[#153543]">{data.assigned_to}</span></Field>
      {data.due_date && <Field label="Due date"><span className="text-sm text-[#153543]">{data.due_date}</span></Field>}
      <Field label="Priority">
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
          data.priority === 'High' ? 'bg-red-100 text-red-700' :
          data.priority === 'Low' ? 'bg-green-100 text-green-700' :
          'bg-amber-100 text-amber-700'
        }`}>{data.priority}</span>
      </Field>
      <Field label="Type"><span className="text-sm text-[#153543]">{data.type}</span></Field>
      {data.description && <Field label="Description"><span className="text-sm text-[#153543]/60 italic">{data.description}</span></Field>}
      {data.notify && data.notify.length > 0 && (
        <Field label="Notify">
          <div className="flex flex-wrap gap-1">
            {data.notify.map((n) => (
              <span key={n} className="text-xs px-2 py-0.5 bg-[#E2F0F6] text-[#153543] rounded-full font-medium">{n}</span>
            ))}
          </div>
        </Field>
      )}
    </>
  );
}

function EditFields({ data, setData }: { data: ParsedResult; setData: (d: ParsedResult) => void }) {
  const inputClass = "w-full px-3 py-1.5 border border-[#D1D5DB] rounded-lg text-sm text-[#153543] bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#49A3CC] focus:border-transparent transition-shadow";
  if (data.intent === 'create_client' || data.intent === 'update_client') {
    return (
      <>
        <Field label="Client name">
          <input value={data.client_name || ''} onChange={(e) => setData({ ...data, client_name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Contact">
          <input value={data.contact_name || ''} onChange={(e) => setData({ ...data, contact_name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Email">
          <input value={data.contact_email || ''} onChange={(e) => setData({ ...data, contact_email: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Status">
          <select value={data.status_update || 'Exploration'} onChange={(e) => setData({ ...data, status_update: e.target.value })} className={inputClass}>
            <option>Exploration</option><option>MOU</option><option>Pilot</option>
            <option>Onboarded</option><option>Active</option><option>Inactive</option>
          </select>
        </Field>
        <Field label="Follow-up">
          <input type="date" value={data.due_date || ''} onChange={(e) => setData({ ...data, due_date: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Assigned to">
          <input value={data.assigned_to || ''} onChange={(e) => setData({ ...data, assigned_to: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Notes">
          <textarea value={data.notes_append || data.description || ''} onChange={(e) => setData({ ...data, notes_append: e.target.value })}
            className={`${inputClass} resize-none`} rows={2} />
        </Field>
        <Field label="Notify">
          <input value={(data.notify || []).join(', ')} onChange={(e) => setData({ ...data, notify: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            className={inputClass} placeholder="e.g. Glenn, Marco" />
        </Field>
      </>
    );
  }
  return (
    <>
      <Field label="Title">
        <input value={data.title || ''} onChange={(e) => setData({ ...data, title: e.target.value })} className={inputClass} />
      </Field>
      <Field label="Assigned to">
        <input value={data.assigned_to || ''} onChange={(e) => setData({ ...data, assigned_to: e.target.value })} className={inputClass} />
      </Field>
      <Field label="Due date">
        <input type="date" value={data.due_date || ''} onChange={(e) => setData({ ...data, due_date: e.target.value })} className={inputClass} />
      </Field>
      <Field label="Priority">
        <select value={data.priority || 'Medium'} onChange={(e) => setData({ ...data, priority: e.target.value })} className={inputClass}>
          <option>High</option><option>Medium</option><option>Low</option>
        </select>
      </Field>
      <Field label="Type">
        <select value={data.type || 'To-do'} onChange={(e) => setData({ ...data, type: e.target.value })} className={inputClass}>
          <option>CRM Follow-up</option><option>Reminder</option><option>To-do</option><option>Other</option>
        </select>
      </Field>
      <Field label="Notify">
        <input value={(data.notify || []).join(', ')} onChange={(e) => setData({ ...data, notify: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          className={inputClass} placeholder="e.g. Glenn, Marco" />
      </Field>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] text-[#153543]/40 uppercase tracking-wider w-24 pt-1 shrink-0 font-semibold">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Exploration: 'bg-purple-100 text-purple-700',
    MOU: 'bg-blue-100 text-blue-700',
    Pilot: 'bg-amber-100 text-amber-700',
    Onboarded: 'bg-teal-100 text-teal-700',
    Active: 'bg-green-100 text-green-700',
    Inactive: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
