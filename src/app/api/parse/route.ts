import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCurrentUser } from '@/lib/auth';
import { getClients, getTasks } from '@/lib/airtable';
import { AIRTABLE, TEAM_MEMBERS } from '@/lib/constants';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { input, history } = await req.json();
  if (!input || typeof input !== 'string') {
    return NextResponse.json({ error: 'Input is required' }, { status: 400 });
  }

  // history is an array of { role: 'user'|'assistant', content: string } for multi-turn
  const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = Array.isArray(history) ? history : [];

  try {
    // Fetch context from Airtable
    const [clients, recentTasks] = await Promise.all([
      getClients(),
      getTasks(`{${AIRTABLE.FIELDS.TASK_RESPONSIBLE}} = "${user.name}"`).catch(() => []),
    ]);

    const clientNames = clients.map((c) => {
      const notesSnippet = c.notes ? c.notes.slice(0, 80).replace(/\n/g, ' ') : '';
      const responsibleStr = c.responsible.length > 0 ? c.responsible.join(', ') : 'None';
      return `${c.name} (ID: ${c.id}, Status: ${c.status || 'Unknown'}, Responsible: ${responsibleStr}${c.nextFollowUp ? ', Follow-up: ' + c.nextFollowUp : ''}${notesSnippet ? ', Notes: ' + notesSnippet + '...' : ''})`;
    }).join('\n');
    const taskList = recentTasks.slice(0, 10).map((t) => `- ${t.task} (Due: ${t.dueDate || 'none'}, Status: ${t.status || 'Open'})`).join('\n');
    const teamList = TEAM_MEMBERS.map((m) => `${m.name} (${m.role})`).join(', ');

    const systemPrompt = `You are TaskFlow AI, the CRM and task assistant for OralLink's founding team. Your PRIMARY job is managing the client pipeline. Parse the user's natural language input into a structured action.

Current user: ${user.name} (${user.role})
Team members: ${teamList}

Existing clients:
${clientNames || 'No clients yet'}

Recent tasks for ${user.name}:
${taskList || 'No recent tasks'}

Return a JSON object with these fields:
{
  "intent": "create_client" | "update_client" | "create_task" | "update_task" | "note",
  "client_match": "record ID of matched client, or null",
  "client_name": "client/company name",
  "contact_name": "contact person name, or null",
  "contact_email": "contact email, or null",
  "client_type": "Corporate" | "AAC/Nursing Home" | "Distributor" | "API Distributor" | "SME" | "Insurance" | "Government" | null,
  "title": "short summary of the action",
  "assigned_to": "team member name (default: current user)",
  "due_date": "YYYY-MM-DD or null",
  "priority": "High" | "Medium" | "Low",
  "type": "CRM Follow-up" | "Reminder" | "To-do" | "Other",
  "status_update": "Exploration" | "MOU" | "Pilot" | "Onboarded" | "Active" | "Inactive" | null,
  "notes_append": "concise new note to APPEND (not replace). Write only the new information, e.g. 'send message to Asia Medic before 20 Oct'. The system will add a date prefix and append to existing notes automatically.",
  "description": "expanded description of the action",
  "notify": ["team member names to email about this, or empty array"],
  "clarification_needed": "question to ask user if input is ambiguous, or null"
}

Rules:
- FUZZY MATCHING IS CRITICAL: When the user mentions a company/client name, ALWAYS check the existing clients list first. Match liberally: ignore spacing ("asia medic" = "Asiamedic"), case, punctuation, abbreviations ("SG Dental" = "Singapore Dental"), partial names ("Raffles" = "Raffles Medical Group"), and minor typos. If there is ANY plausible match (even partial), use "update_client" with that client's record ID in client_match. Only use "create_client" if you are confident the name is truly new and does not match any existing client.
- NEVER assume create_client when the name is even remotely close to an existing client. When in doubt, set clarification_needed to ask the user: "Did you mean [closest match]? Or is this a new client?"
- If mentioning an existing client by name, use "update_client" to update their status or notes.
- Only use "create_task" if the input is clearly about an internal task unrelated to a client.
- For new clients, default status_update to "Exploration" unless the input suggests otherwise (e.g. "onboarding" -> "Onboarded", "pilot" -> "Pilot", "MOU" -> "MOU").
- If the input mentions a contact person and their email, extract both into contact_name and contact_email.
- If the input mentions a follow-up date or deadline, put it in due_date.
- Write a helpful notes_append describing next steps based on the input context.
- The "notify" array determines who is RESPONSIBLE for this client and who receives all future email updates. If the input says "notify", "email", "tell", "let X know", or mentions who should handle/own/be responsible for a client, add those team member names to the notify array. If no notification is mentioned, default to the assigned_to person. The notify list is saved on the client record, so future updates (even from Airtable directly) will email all listed people.
- Default priority is Medium.
- Today's date is ${new Date().toISOString().split('T')[0]}.
- "Tomorrow" means the next day, "next week" means +7 days, "Friday" means the coming Friday.
- If assigning to someone, match to the team list above.
- Return ONLY the JSON object, no markdown, no explanation.`;

    // Build messages: include conversation history for multi-turn clarifications
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: input + '\n\nRespond with ONLY a JSON object, no markdown fences, no explanation.' });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    if (!message.content || message.content.length === 0) {
      return NextResponse.json(
        { error: 'AI returned empty response' },
        { status: 500 }
      );
    }

    // Find the text block (model may return thinking blocks first)
    const textBlock = message.content.find((b: { type: string }) => b.type === 'text');
    let text = textBlock && 'text' in textBlock ? (textBlock as { type: string; text: string }).text : '';

    if (!text) {
      return NextResponse.json(
        { error: 'AI returned no text content' },
        { status: 500 }
      );
    }

    // Strip markdown code fences if present
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Parse JSON from response
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try to extract JSON object from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json(
            { error: 'Failed to parse AI response', raw: text.slice(0, 500) },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Failed to parse AI response', raw: text.slice(0, 500) },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ parsed, sourceInput: input, aiRawText: text });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Parse error:', errMsg);
    return NextResponse.json(
      { error: `Failed to process input: ${errMsg}` },
      { status: 500 }
    );
  }
}
