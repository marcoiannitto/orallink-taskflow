import { NextRequest, NextResponse } from 'next/server';
import { FieldSet } from 'airtable';
import { getCurrentUser } from '@/lib/auth';
import { createTask, updateClient } from '@/lib/airtable';
import { AIRTABLE, TEAM_MEMBERS } from '@/lib/constants';

const F = AIRTABLE.FIELDS;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { parsed, sourceInput } = await req.json();

  try {
    const results: string[] = [];

    // Create task if intent is task-related
    if (['create_task', 'note'].includes(parsed.intent) || parsed.title) {
      const assignedMember = TEAM_MEMBERS.find(
        (m) => m.name.toLowerCase() === (parsed.assigned_to || user.name).toLowerCase()
      );

      const taskFields: Partial<FieldSet> = {
        [F.TASK]: parsed.title,
        [F.TASK_CREATED_BY]: user.name,
        [F.TASK_SOURCE_INPUT]: sourceInput,
      };

      if (parsed.due_date) taskFields[F.TASK_DUE_DATE] = parsed.due_date;
      if (parsed.priority) taskFields[F.TASK_PRIORITY] = parsed.priority;
      if (parsed.type) taskFields[F.TASK_TYPE] = parsed.type;
      if (parsed.description) taskFields[F.TASK_DESCRIPTION] = parsed.description;
      if (parsed.client_match) taskFields[F.TASK_CLIENTS] = [parsed.client_match];
      if (assignedMember) taskFields[F.TASK_RESPONSIBLE] = assignedMember.name;

      await createTask(taskFields);
      results.push('Task created');
    }

    // Update client status if applicable
    if (parsed.intent === 'update_client' && parsed.client_match) {
      const updateFields: Partial<FieldSet> = {};
      if (parsed.status_update) updateFields['Status'] = parsed.status_update;
      if (parsed.notes_append) updateFields['Notes'] = parsed.notes_append;

      if (Object.keys(updateFields).length > 0) {
        await updateClient(parsed.client_match, updateFields);
        results.push('Client updated');
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error('Confirm error:', error);
    return NextResponse.json(
      { error: 'Failed to save to Airtable' },
      { status: 500 }
    );
  }
}
