import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTasks, updateTask } from '@/lib/airtable';
import { AIRTABLE } from '@/lib/constants';

const F = AIRTABLE.FIELDS;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const tasks = await getTasks();
    return NextResponse.json({ tasks });
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
