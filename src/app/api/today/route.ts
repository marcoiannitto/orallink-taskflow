import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTasks, getClients } from '@/lib/airtable';
import { TEAM_MEMBERS } from '@/lib/constants';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const [tasks, clients] = await Promise.all([
      getTasks(),
      getClients(),
    ]);

    const today = new Date().toISOString().split('T')[0];

    // Tasks: due today or overdue, not done
    const dueTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      if (/done|complete/i.test(t.status || '')) return false;
      return t.dueDate <= today;
    });

    // Clients: follow-up due today or overdue, not inactive
    const dueClients = clients.filter((c) => {
      if (!c.nextFollowUp) return false;
      if (c.status === 'Inactive') return false;
      return c.nextFollowUp <= today;
    });

    // Upcoming tasks (next 7 days, not overdue, not done)
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekStr = weekFromNow.toISOString().split('T')[0];

    const upcomingTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      if (/done|complete/i.test(t.status || '')) return false;
      return t.dueDate > today && t.dueDate <= weekStr;
    });

    // Upcoming client follow-ups (next 7 days)
    const upcomingClients = clients.filter((c) => {
      if (!c.nextFollowUp) return false;
      if (c.status === 'Inactive') return false;
      return c.nextFollowUp > today && c.nextFollowUp <= weekStr;
    });

    return NextResponse.json({
      dueTasks,
      dueClients,
      upcomingTasks,
      upcomingClients,
      today,
    });
  } catch (error) {
    console.error('Today fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
