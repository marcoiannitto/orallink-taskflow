import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCurrentUser } from '@/lib/auth';
import { getClients, getTasks } from '@/lib/airtable';
import { TEAM_MEMBERS } from '@/lib/constants';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { input } = await req.json();
  if (!input || typeof input !== 'string') {
    return NextResponse.json({ error: 'Input is required' }, { status: 400 });
  }

  try {
    // Fetch context from Airtable
    const [clients, recentTasks] = await Promise.all([
      getClients(),
      getTasks(`{Responsible} = "${user.name}"`).catch(() => []),
    ]);

    const clientNames = clients.map((c) => `${c.name} (ID: ${c.id}, Status: ${c.status || 'Unknown'})`).join('\n');
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
  "notes_append": "description of next steps, notes, or context, or null",
  "description": "expanded description of the action",
  "clarification_needed": "question to ask user if input is ambiguous, or null"
}

Rules:
- PRIORITIZE CRM: If the input mentions a new company/client/contact name that doesn't match existing clients, use "create_client" intent.
- If mentioning an existing client by name, use "update_client" to update their status or notes.
- Only use "create_task" if the input is clearly about an internal task unrelated to a client.
- For new clients, default status_update to "Exploration" unless the input suggests otherwise (e.g. "onboarding" → "Onboarded", "pilot" → "Pilot", "MOU" → "MOU").
- If the input mentions a contact person and their email, extract both into contact_name and contact_email.
- If the input mentions a follow-up date or deadline, put it in due_date.
- Write a helpful notes_append describing next steps based on the input context.
- If the input mentions a client name, try to match it to an existing client. Use fuzzy matching.
- Default priority is Medium.
- Today's date is ${new Date().toISOString().split('T')[0]}.
- "Tomorrow" means the next day, "next week" means +7 days, "Friday" means the coming Friday.
- If assigning to someone, match to the team list above.
- Return ONLY the JSON object, no markdown, no explanation.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: input + '\n\nRespond with ONLY a JSON object, no markdown fences, no explanation.' }],
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

    return NextResponse.json({ parsed, sourceInput: input });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Parse error:', errMsg);
    return NextResponse.json(
      { error: `Failed to process input: ${errMsg}` },
      { status: 500 }
    );
  }
}
