import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getTasksDueSoon, updateTask } from '@/lib/airtable';
import { AIRTABLE, TEAM_MEMBERS } from '@/lib/constants';

const resend = new Resend(process.env.RESEND_API_KEY);
const F = AIRTABLE.FIELDS;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tasks = await getTasksDueSoon();
    const results: string[] = [];

    for (const task of tasks) {
      const member = TEAM_MEMBERS.find((m) => m.name === task.responsible);
      if (!member) continue;

      // Send email
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'taskflow@orallink.health',
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

        // Mark notification sent
        await updateTask(task.id, { [F.TASK_NOTIFICATION_SENT]: true });
        results.push(`Notified ${member.name}: ${task.task}`);
      } catch (emailError) {
        console.error(`Failed to notify ${member.name}:`, emailError);
        results.push(`FAILED ${member.name}: ${task.task}`);
      }
    }

    return NextResponse.json({
      ok: true,
      processed: tasks.length,
      results,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
