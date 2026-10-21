import { NextRequest, NextResponse } from 'next/server';
import { FieldSet } from 'airtable';
import { Resend } from 'resend';
import { getCurrentUser } from '@/lib/auth';
import { createTask, createClient, updateClient, getClientById, namesToRecordIds } from '@/lib/airtable';
import { summarizeNextSteps } from '@/lib/ai-summary';
import { logActivity } from '@/lib/activity';
import { newClientEmail, clientUpdatedEmail } from '@/lib/email-templates';
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

  if (!parsed?.intent) {
    return NextResponse.json({ error: 'Invalid payload: missing intent' }, { status: 400 });
  }

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
      logActivity({
        user: user.name,
        action: 'create_task',
        entityName: parsed.title || 'Untitled task',
        details: `Assigned to ${parsed.assigned_to || user.name}${parsed.due_date ? `, due ${parsed.due_date}` : ''}`,
      });
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

      // Build the responsible list: explicit notify (even if empty) → assigned person → current user
      const responsibleNames: string[] = Array.isArray(parsed.notify)
        ? (parsed.notify as string[])
        : [assignedMember?.name || user.name];
      // Save as linked record IDs on the client record
      const responsibleIds = namesToRecordIds(responsibleNames);
      if (responsibleIds.length > 0) clientFields[F.CLIENT_RESPONSIBLE] = responsibleIds;

      await createClient(clientFields);
      results.push('Client created');
      logActivity({
        user: user.name,
        action: 'create_client',
        entityName: parsed.client_name || parsed.title || 'Unnamed client',
        details: `Status: ${parsed.status_update || 'Exploration'}${parsed.contact_name ? `, Contact: ${parsed.contact_name}` : ''}`,
      });

      // Send email notification
      const clientName = parsed.client_name || parsed.title;
      const rawNotes = parsed.notes_append || parsed.description || '';

      // Email everyone in the responsible list
      const notifyNames: string[] = responsibleNames;
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
            html: newClientEmail({
              clientName,
              status: parsed.status_update || 'Exploration',
              followUpDate,
              contactName: parsed.contact_name,
              contactEmail: parsed.contact_email,
              nextSteps,
            }),
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
      if (parsed.contact_name) updateFields[F.CLIENT_CONTACT_NAME] = parsed.contact_name;
      if (parsed.contact_email) updateFields[F.CLIENT_CONTACT_EMAIL] = parsed.contact_email;
      if (parsed.client_type) updateFields[F.CLIENT_TYPE] = parsed.client_type;

      // Fetch client once — reused for notes append and email recipients below
      const existingClient = await getClientById(parsed.client_match);

      // Append notes with datestamp, never replace
      if (parsed.notes_append) {
        const dateStamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const newEntry = `${dateStamp} - ${parsed.notes_append}`;
        const existingNotes = existingClient?.notes?.trim() || '';
        updateFields[F.CLIENT_NOTES] = existingNotes
          ? `${newEntry}\n${existingNotes}`
          : newEntry;
      }

      // If notify list is provided, update the stored responsible field too (as linked record IDs)
      if (parsed.notify?.length) {
        const notifyIds = namesToRecordIds(parsed.notify as string[]);
        if (notifyIds.length > 0) updateFields[F.CLIENT_RESPONSIBLE] = notifyIds;
      }

      if (Object.keys(updateFields).length > 0) {
        await updateClient(parsed.client_match, updateFields);
        results.push('Client updated');

        const changesList: string[] = [];
        if (parsed.status_update) changesList.push(`Status → ${parsed.status_update}`);
        if (parsed.due_date) changesList.push(`Follow-up → ${parsed.due_date}`);
        if (parsed.notes_append) changesList.push('Notes updated');
        if (parsed.contact_name) changesList.push(`Contact: ${parsed.contact_name}`);
        logActivity({
          user: user.name,
          action: 'update_client',
          entityName: parsed.client_name || parsed.title || 'Unknown client',
          details: changesList.join(', ') || 'Fields updated',
        });

        // Send email notification on update
        const clientName = parsed.client_name || parsed.title;
        const rawNotes = parsed.notes_append || '';

        // Use the client fetched above for recipient lookup
        const storedResponsible = existingClient?.responsible || [];

        // Priority: explicit notify (even if empty = no email) → stored responsible list → current user
        const notifyNames: string[] = Array.isArray(parsed.notify)
          ? (parsed.notify as string[])
          : storedResponsible.length > 0
            ? storedResponsible
            : [user.name];
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
              html: clientUpdatedEmail({
                clientName,
                changesSummary: changes.join(' · '),
                nextSteps,
              }),
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
