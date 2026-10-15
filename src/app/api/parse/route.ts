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

    const systemPrompt = `You are TaskFlow AI, the task and CRM assistant for OralLink's founding team. Parse the user's natural language input into a structured action.

Current user: ${user.name} (${user.role})
Team members: ${teamList}

Existing clients:
${clientNames || 'No clients yet'}

Recent tasks for ${user.name}:
${taskList || 'No recent tasks'}

Return a JSON object with these fields:
{
  "intent": "create_task" | "update_task" | "create_client" | "update_client" | "note",
  "client_match": "record ID of matched client, or null",
  "client_name": "client name if creating new, or matched name",
  "title": "task or action title",
  "assigned_to": "team member name (default: current user)",
  "due_date": "YYYY-MM-DD or null",
  "priority": "High" | "Medium" | "Low",
  "type": "CRM Follow-up" | "Reminder" | "To-do" | "Other",
  "status_update": "new status for client if updating, or null",
  "notes_append": "any notes to add, or null",
  "description": "expanded description of the task",
  "clarification_needed": "question to ask user if input is ambiguous, or null"
}

Rules:
- If the input mentions a client name, try to match it to an existing client. Use fuzzy matching.
- If no due date is mentioned, leave it null.
- Default priority is Medium.
- If the input is ambiguous, set clarification_needed with a specific question.
- Today's date is ${new Date().toISOString().split('T')[0]}.
- "Tomorrow" means the next day, "next week" means +7 days, "Friday" means the coming Friday.
- If assigning to someone, match to the team list above.
- Return ONLY the JSON object, no markdown, no explanation.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: input }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON from response
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: 'Failed to parse AI response', raw: text },
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
