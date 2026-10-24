import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getCurrentUser } from '@/lib/auth';
import { getTasks, updateTask, namesToRecordIds } from '@/lib/airtable';
import { AIRTABLE, TEAM_MEMBERS, hasPermission } from '@/lib/constants';
import type { PermissionLevel } from '@/lib/constants';
import { logActivity } from '@/lib/activity';
import { taskReassignedEmail } from '@/lib/email-templates';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'taskflow@orallink.health';

const F = AIRTABLE.FIELDS;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const tasks = await getTasks();

    // Admins see all tasks; others see only tasks assigned to them
    const userPermission: PermissionLevel = user.permission || 'member';
    const isAdmin = hasPermission(userPermission, 'admin');

    const visibleTasks = isAdmin
      ? tasks
      : tasks.filter((t) => {
          if (!t.responsible) return false;
          const names = t.responsible.split(',').map((n) => n.trim().toLowerCase());
          return names.includes(user.name.toLowerCase());
        });

    // Also return team names for the responsible dropdown
    const teamNames = TEAM_MEMBERS.map((m) => m.name);

    return NextResponse.json({ tasks: visibleTasks, isAdmin, teamNames });
  } catch (error) {
    console.error('Tasks fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

/** Allowed editable fields and their Airtable field ID mappings */
const EDITABLE_FIELDS: Record<string, string> = {
  task: F.TASK,
  dueDate: F.TASK_DUE_DATE,
  status: F.TASK_STATUS,
  priority: F.TASK_PRIORITY,
  type: F.TASK_TYPE,
  description: F.TASK_DESCRIPTION,
};

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body as Record<string, unknown>;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing task id' }, { status: 400 });
  }

  try {
    const fields: Record<string, unknown> = {};
    const changedFields: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'responsible') {
        // Convert names to record IDs for linked record field
        const names = typeof value === 'string'
          ? value.split(',').map((n) => n.trim()).filter(Boolean)
          : Array.isArray(value) ? value : [];
        fields[F.TASK_RESPONSIBLE] = namesToRecordIds(names as string[]);
        changedFields.push('responsible');
      } else if (key in EDITABLE_FIELDS) {
        // Clear field if value is empty string
        fields[EDITABLE_FIELDS[key]] = value === '' ? undefined : value;
        changedFields.push(key);
      }
      // Silently ignore unknown fields
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await updateTask(id, fields as Parameters<typeof updateTask>[1]);

    // Log the edit to activity
    logActivity({
      user: user.name,
      action: 'update_task',
      entityName: (updates.task as string) || 'Task',
      details: `Updated: ${changedFields.join(', ')}`,
    });

    // Email the new assignee when task is reassigned
    if (changedFields.includes('responsible') && process.env.RESEND_API_KEY) {
      const newResponsible = typeof updates.responsible === 'string'
        ? updates.responsible.split(',').map((n: string) => n.trim()).filter(Boolean)
        : Array.isArray(updates.responsible) ? updates.responsible as string[] : [];
      const newMembers = newResponsible
        .map((n: string) => TEAM_MEMBERS.find((m) => m.name.toLowerCase() === n.toLowerCase()))
        .filter(Boolean);

      for (const member of newMembers) {
        if (!member || member.name === user.name) continue; // Don't email yourself
        try {
          await getResend().emails.send({
            from: FROM_EMAIL,
            to: member.email,
            subject: `Task Reassigned: ${(updates.task as string) || 'Task'}`,
            html: taskReassignedEmail({
              taskName: (updates.task as string) || 'Task',
              reassignedBy: user.name,
              dueDate: updates.dueDate
                ? new Date(updates.dueDate as string).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
                : undefined,
              priority: updates.priority as string | undefined,
            }),
          });
        } catch (emailError) {
          console.error(`Failed to email reassignment to ${member.name}:`, emailError);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Task update error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
