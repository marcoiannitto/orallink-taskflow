import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTasks, updateTask } from '@/lib/airtable';
import { AIRTABLE, hasPermission } from '@/lib/constants';
import type { PermissionLevel } from '@/lib/constants';

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
          // responsible is a comma-separated string of names (resolved from linked records)
          const names = t.responsible.split(',').map((n) => n.trim().toLowerCase());
          return names.includes(user.name.toLowerCase());
        });

    return NextResponse.json({ tasks: visibleTasks, isAdmin });
  } catch (error) {
    console.error('Tasks fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, status } = await req.json();
  try {
    await updateTask(id, { [F.TASK_STATUS]: status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Task update error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
