import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getTasksDueSoon, updateTask, getClientsDueFollowUp, updateClient } from '@/lib/airtable';
import { summarizeNextSteps } from '@/lib/ai-summary';
import { AIRTABLE, TEAM_MEMBERS } from '@/lib/constants';

const resend = new Resend(process.env.RESEND_API_KEY);
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
        await resend.emails.send({
          from: FROM_EMAIL,
          to: member.email,
          subject: `TaskFlow Reminder: ${task.task}`,
          html: `
            <div style="font-family: 'Trebuchet MS', Arial, sans-serif; max-width: 480px; margin: 0 auto;">
              <div style="background: #153543; color: white; padding: 16px 20px; border-radius: 12px 12px 0 0;">
                <h2 style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">TaskFlow Reminder</h2>
              </div>
              <div style="background: white; border: 1px solid #D1D5DB; border-top: 0; padding: 20px; border-radius: 0 0 12px 12px;">
                <h3 style="color: #153543; margin: 0 0 8px;">${task.task}</h3>
                ${task.dueDate ? `<p style="color: #FF6F59; font-size: 14px; margin: 0 0 4px;">Due: ${new Date(task.dueDate).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })}</p>` : ''}
                ${task.priority ? `<p style="font-size: 13px; color: #666;">Priority: ${task.priority}</p>` : ''}
                ${task.description ? `<p style="font-size: 13px; color: #666;">${task.description}</p>` : ''}
              </div>
            </div>
          `,
        });

        await updateTask(task.id, { [F.TASK_NOTIFICATION_SENT]: true });
        results.push(`Task reminder sent to ${member.name}: ${task.task}`);
      } catch (emailError) {
        console.error(`Failed to notify ${member.name}:`, emailError);
        results.push(`FAILED task reminder ${member.name}: ${task.task}`);
      }
    }

    // Client follow-up reminders
    for (const client of clients) {
      const member = TEAM_MEMBERS.find((m) => m.name === client.responsible);
      if (!member) continue;

      try {
        // AI-summarize next steps from notes
        const nextSteps = client.notes
          ? await summarizeNextSteps(client.name, client.notes, client.status)
          : 'No notes recorded. Check in with the client.';

        const followUpDate = client.nextFollowUp
          ? new Date(client.nextFollowUp).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
          : 'Today';

        await resend.emails.send({
          from: FROM_EMAIL,
          to: member.email,
          subject: `Client Follow-up: ${client.name}`,
          html: `
            <div style="font-family: 'Trebuchet MS', Arial, sans-serif; max-width: 480px; margin: 0 auto;">
              <div style="background: #153543; color: white; padding: 16px 20px; border-radius: 12px 12px 0 0;">
                <h2 style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Client Follow-up</h2>
              </div>
              <div style="background: white; border: 1px solid #D1D5DB; border-top: 0; padding: 20px; border-radius: 0 0 12px 12px;">
                <h3 style="color: #153543; margin: 0 0 4px;">${client.name}</h3>
                <p style="color: #49A3CC; font-size: 13px; margin: 0 0 12px;">Status: ${client.status || 'Exploration'} · Follow-up: ${followUpDate}</p>
                <div style="background: #F7F7F7; border-radius: 8px; padding: 12px; margin: 0;">
                  <p style="font-size: 12px; color: #153543; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">Next Steps</p>
                  <p style="font-size: 14px; color: #153543; margin: 0; white-space: pre-line;">${nextSteps}</p>
                </div>
              </div>
            </div>
          `,
        });

        results.push(`Follow-up reminder sent to ${member.name}: ${client.name}`);
      } catch (emailError) {
        console.error(`Failed to send follow-up for ${client.name}:`, emailError);
        results.push(`FAILED follow-up ${member.name}: ${client.name}`);
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
