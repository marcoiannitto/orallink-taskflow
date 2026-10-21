import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getTasksDueSoon, updateTask, getClientsDueFollowUp, updateClient } from '@/lib/airtable';
import { summarizeNextSteps } from '@/lib/ai-summary';
import { taskReminderEmail, clientFollowUpEmail } from '@/lib/email-templates';
import { AIRTABLE, TEAM_MEMBERS } from '@/lib/constants';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const F = AIRTABLE.FIELDS;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'taskflow@orallink.health';

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [tasks, clients] = await Promise.all([
      getTasksDueSoon(),
      getClientsDueFollowUp(),
    ]);
    const results: string[] = [];

    // Task reminders
    for (const task of tasks) {
      const member = TEAM_MEMBERS.find((m) => m.name === task.responsible);
      if (!member) continue;

      try {
        await getResend().emails.send({
          from: FROM_EMAIL,
          to: member.email,
          subject: `TaskFlow Reminder: ${task.task}`,
          html: taskReminderEmail({
            taskName: task.task,
            dueDate: task.dueDate
              ? new Date(task.dueDate).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
              : undefined,
            priority: task.priority,
            description: task.description,
          }),
        });

        await updateTask(task.id, { [F.TASK_NOTIFICATION_SENT]: true });
        results.push(`Task reminder sent to ${member.name}: ${task.task}`);
      } catch (emailError) {
        console.error(`Failed to notify ${member.name}:`, emailError);
        results.push(`FAILED task reminder ${member.name}: ${task.task}`);
      }
    }

    // Client follow-up reminders — notify ALL responsible people
    for (const client of clients) {
      const responsibleNames = client.responsible;
      const members = responsibleNames
        .map((name) => TEAM_MEMBERS.find((m) => m.name === name))
        .filter(Boolean);
      if (members.length === 0) continue;

      try {
        // AI-summarize next steps from notes
        const nextSteps = client.notes
          ? await summarizeNextSteps(client.name, client.notes, client.status)
          : 'No notes recorded. Check in with the client.';

        const followUpDate = client.nextFollowUp
          ? new Date(client.nextFollowUp).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
          : 'Today';

        await getResend().emails.send({
          from: FROM_EMAIL,
          to: members.map((m) => m!.email),
          subject: `Client Follow-up: ${client.name}`,
          html: clientFollowUpEmail({
            clientName: client.name,
            status: client.status || 'Exploration',
            followUpDate,
            nextSteps,
          }),
        });

        results.push(`Follow-up reminder sent to ${members.map((m) => m!.name).join(', ')}: ${client.name}`);
      } catch (emailError) {
        console.error(`Failed to send follow-up for ${client.name}:`, emailError);
        results.push(`FAILED follow-up for ${client.name}`);
      }
    }

    return NextResponse.json({
      ok: true,
      processed: { tasks: tasks.length, clients: clients.length },
      results,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
