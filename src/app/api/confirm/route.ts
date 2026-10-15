import { NextRequest, NextResponse } from 'next/server';
import { FieldSet } from 'airtable';
import { Resend } from 'resend';
import { getCurrentUser } from '@/lib/auth';
import { createTask, createClient, updateClient, getClientById } from '@/lib/airtable';
import { summarizeNextSteps } from '@/lib/ai-summary';
import { AIRTABLE, TEAM_MEMBERS } from '@/lib/constants';

const resend = new Resend(process.env.RESEND_API_KEY);
const F = AIRTABLE.FIELDS;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'taskflow@orallink.health';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { parsed, sourceInput } = await req.json();

  try {
    const results: string[] = [];

    // Create task if intent is task-related
    if (['create_task', 'note'].includes(parsed.intent)) {
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

    // Create new client
    if (parsed.intent === 'create_client') {
      const assignedMember = TEAM_MEMBERS.find(
        (m) => m.name.toLowerCase() === (parsed.assigned_to || user.name).toLowerCase()
      );

      const clientFields: Partial<FieldSet> = {
        [F.CLIENT_NAME]: parsed.client_name || parsed.title,
        [F.CLIENT_STATUS]: parsed.status_update || 'Exploration',
        [F.CLIENT_DATE_CREATED]: new Date().toISOString().split('T')[0],
      };

      if (parsed.notes_append || parsed.description) {
        clientFields[F.CLIENT_NOTES] = parsed.notes_append || parsed.description;
      }
      if (parsed.due_date) clientFields[F.CLIENT_NEXT_FOLLOWUP] = parsed.due_date;
      if (parsed.contact_email) clientFields[F.CLIENT_CONTACT_EMAIL] = parsed.contact_email;
      if (parsed.contact_name) clientFields[F.CLIENT_CONTACT_NAME] = parsed.contact_name;
      if (parsed.client_type) clientFields[F.CLIENT_TYPE] = parsed.client_type;
      if (assignedMember) clientFields[F.CLIENT_RESPONSIBLE] = assignedMember.name;

      await createClient(clientFields);
      results.push('Client created');

      // Send email notification
      const clientName = parsed.client_name || parsed.title;
      const rawNotes = parsed.notes_append || parsed.description || '';

      // Determine who to email: notify list, or assigned person, or current user
      const notifyNames: string[] = parsed.notify
        ? (parsed.notify as string[])
        : [assignedMember?.name || user.name];
      const recipients = notifyNames
        .map((n: string) => TEAM_MEMBERS.find((m) => m.name.toLowerCase() === n.toLowerCase()))
        .filter(Boolean);

      if (recipients.length > 0 && process.env.RESEND_API_KEY) {
        const nextSteps = rawNotes
          ? await summarizeNextSteps(clientName, rawNotes, parsed.status_update || 'Exploration')
          : 'New client added. Set up initial meeting and define next steps.';

        const followUpDate = parsed.due_date
          ? new Date(parsed.due_date).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
          : 'Not set';

        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: recipients.map((m) => m!.email),
            subject: `New Client Added: ${clientName}`,
            html: `
              <div style="font-family: 'Trebuchet MS', Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <div style="background: #153543; color: white; padding: 16px 20px; border-radius: 12px 12px 0 0;">
                  <h2 style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">New Client Added</h2>
                </div>
                <div style="background: white; border: 1px solid #D1D5DB; border-top: 0; padding: 20px; border-radius: 0 0 12px 12px;">
                  <h3 style="color: #153543; margin: 0 0 4px;">${clientName}</h3>
                  <p style="color: #49A3CC; font-size: 13px; margin: 0 0 12px;">Status: ${parsed.status_update || 'Exploration'} · Follow-up: ${followUpDate}</p>
                  ${parsed.contact_name ? `<p style="font-size: 13px; color: #666; margin: 0 0 4px;">Contact: ${parsed.contact_name}${parsed.contact_email ? ` (${parsed.contact_email})` : ''}</p>` : ''}
                  <div style="background: #F7F7F7; border-radius: 8px; padding: 12px; margin: 12px 0 0;">
                    <p style="font-size: 12px; color: #153543; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">Next Steps</p>
                    <p style="font-size: 14px; color: #153543; margin: 0; white-space: pre-line;">${nextSteps}</p>
                  </div>
                </div>
              </div>
            `,
          });
          results.push(`Email sent to ${recipients.map((m) => m!.name).join(', ')}`);
        } catch (emailError) {
          console.error('Email send error:', emailError);
          results.push('Client created but email failed');
        }
      }
    }

    // Update client status if applicable
    if (parsed.intent === 'update_client' && parsed.client_match) {
      const updateFields: Partial<FieldSet> = {};
      if (parsed.status_update) updateFields[F.CLIENT_STATUS] = parsed.status_update;
      if (parsed.due_date) updateFields[F.CLIENT_NEXT_FOLLOWUP] = parsed.due_date;

      // Append notes with datestamp, never replace
      if (parsed.notes_append) {
        const existing = await getClientById(parsed.client_match);
        const dateStamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const newEntry = `${dateStamp} - ${parsed.notes_append}`;
        const existingNotes = existing?.notes?.trim() || '';
        updateFields[F.CLIENT_NOTES] = existingNotes
          ? `${existingNotes}\n${newEntry}`
          : newEntry;
      }

      if (Object.keys(updateFields).length > 0) {
        await updateClient(parsed.client_match, updateFields);
        results.push('Client updated');

        // Send email notification on update
        const clientName = parsed.client_name || parsed.title;
        const rawNotes = parsed.notes_append || '';

        const assignedMember = TEAM_MEMBERS.find(
          (m) => m.name.toLowerCase() === (parsed.assigned_to || user.name).toLowerCase()
        );
        const notifyNames: string[] = parsed.notify?.length
          ? (parsed.notify as string[])
          : [assignedMember?.name || user.name];
        const recipients = notifyNames
          .map((n: string) => TEAM_MEMBERS.find((m) => m.name.toLowerCase() === n.toLowerCase()))
          .filter(Boolean);

        if (recipients.length > 0 && process.env.RESEND_API_KEY) {
          const nextSteps = rawNotes
            ? await summarizeNextSteps(clientName, rawNotes, parsed.status_update)
            : null;

          const followUpDate = parsed.due_date
            ? new Date(parsed.due_date).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
            : null;

          const changes: string[] = [];
          if (parsed.status_update) changes.push(`Status → ${parsed.status_update}`);
          if (followUpDate) changes.push(`Follow-up → ${followUpDate}`);
          if (rawNotes) changes.push('Notes updated');

          try {
            await resend.emails.send({
              from: FROM_EMAIL,
              to: recipients.map((m) => m!.email),
              subject: `Client Updated: ${clientName}`,
              html: `
                <div style="font-family: 'Trebuchet MS', Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                  <div style="background: #153543; color: white; padding: 16px 20px; border-radius: 12px 12px 0 0;">
                    <h2 style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Client Updated</h2>
                  </div>
                  <div style="background: white; border: 1px solid #D1D5DB; border-top: 0; padding: 20px; border-radius: 0 0 12px 12px;">
                    <h3 style="color: #153543; margin: 0 0 4px;">${clientName}</h3>
                    <p style="color: #49A3CC; font-size: 13px; margin: 0 0 12px;">${changes.join(' · ')}</p>
                    ${nextSteps ? `
                    <div style="background: #F7F7F7; border-radius: 8px; padding: 12px; margin: 0;">
                      <p style="font-size: 12px; color: #153543; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">Next Steps</p>
                      <p style="font-size: 14px; color: #153543; margin: 0; white-space: pre-line;">${nextSteps}</p>
                    </div>
                    ` : ''}
                  </div>
                </div>
              `,
            });
            results.push(`Email sent to ${recipients.map((m) => m!.name).join(', ')}`);
          } catch (emailError) {
            console.error('Email send error:', emailError);
            results.push('Client updated but email failed');
          }
        }
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
