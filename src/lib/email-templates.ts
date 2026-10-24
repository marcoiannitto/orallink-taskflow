/**
 * Shared email templates for OralLink TaskFlow notifications.
 * All templates use the OralLink brand wrapper.
 */

/** Wrap body content in the branded email shell */
function wrap(heading: string, body: string): string {
  return `
    <div style="font-family: 'Trebuchet MS', Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: #153543; color: white; padding: 16px 20px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">${heading}</h2>
      </div>
      <div style="background: white; border: 1px solid #D1D5DB; border-top: 0; padding: 20px; border-radius: 0 0 12px 12px;">
        ${body}
      </div>
    </div>
  `;
}

function nextStepsBlock(nextSteps: string): string {
  return `
    <div style="background: #F7F7F7; border-radius: 8px; padding: 12px; margin: 12px 0 0;">
      <p style="font-size: 12px; color: #153543; opacity: 0.5; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 6px;">Next Steps</p>
      <p style="font-size: 14px; color: #153543; margin: 0; white-space: pre-line;">${nextSteps}</p>
    </div>
  `;
}

/** New client added notification */
export function newClientEmail(opts: {
  clientName: string;
  status: string;
  followUpDate: string;
  contactName?: string;
  contactEmail?: string;
  nextSteps: string;
}): string {
  const contact = opts.contactName
    ? `<p style="font-size: 13px; color: #666; margin: 0 0 4px;">Contact: ${opts.contactName}${opts.contactEmail ? ` (${opts.contactEmail})` : ''}</p>`
    : '';

  return wrap('New Client Added', `
    <h3 style="color: #153543; margin: 0 0 4px;">${opts.clientName}</h3>
    <p style="color: #49A3CC; font-size: 13px; margin: 0 0 12px;">Status: ${opts.status} · Follow-up: ${opts.followUpDate}</p>
    ${contact}
    ${nextStepsBlock(opts.nextSteps)}
  `);
}

/** Client updated notification */
export function clientUpdatedEmail(opts: {
  clientName: string;
  changesSummary: string;
  nextSteps?: string | null;
}): string {
  return wrap('Client Updated', `
    <h3 style="color: #153543; margin: 0 0 4px;">${opts.clientName}</h3>
    <p style="color: #49A3CC; font-size: 13px; margin: 0 0 12px;">${opts.changesSummary}</p>
    ${opts.nextSteps ? nextStepsBlock(opts.nextSteps) : ''}
  `);
}

/** Task assigned notification */
export function taskAssignedEmail(opts: {
  taskName: string;
  assignedBy: string;
  dueDate?: string;
  priority?: string;
  description?: string;
  clientName?: string;
}): string {
  const due = opts.dueDate
    ? `<p style="color: #49A3CC; font-size: 13px; margin: 0 0 4px;">Due: ${opts.dueDate}</p>`
    : '';
  const priority = opts.priority
    ? `<p style="font-size: 13px; color: #666; margin: 0 0 4px;">Priority: ${opts.priority}</p>`
    : '';
  const client = opts.clientName
    ? `<p style="font-size: 13px; color: #666; margin: 0 0 4px;">Client: ${opts.clientName}</p>`
    : '';
  const desc = opts.description
    ? `<div style="background: #F7F7F7; border-radius: 8px; padding: 12px; margin: 12px 0 0;"><p style="font-size: 13px; color: #153543; margin: 0;">${opts.description}</p></div>`
    : '';

  return wrap('New Task Assigned', `
    <h3 style="color: #153543; margin: 0 0 8px;">${opts.taskName}</h3>
    <p style="font-size: 13px; color: #666; margin: 0 0 4px;">Assigned by ${opts.assignedBy}</p>
    ${due}${priority}${client}${desc}
  `);
}

/** Task reassigned notification */
export function taskReassignedEmail(opts: {
  taskName: string;
  reassignedBy: string;
  dueDate?: string;
  priority?: string;
}): string {
  const due = opts.dueDate
    ? `<p style="color: #49A3CC; font-size: 13px; margin: 0 0 4px;">Due: ${opts.dueDate}</p>`
    : '';
  const priority = opts.priority
    ? `<p style="font-size: 13px; color: #666;">Priority: ${opts.priority}</p>`
    : '';

  return wrap('Task Reassigned to You', `
    <h3 style="color: #153543; margin: 0 0 8px;">${opts.taskName}</h3>
    <p style="font-size: 13px; color: #666; margin: 0 0 4px;">Reassigned by ${opts.reassignedBy}</p>
    ${due}${priority}
  `);
}

/** Task reminder notification */
export function taskReminderEmail(opts: {
  taskName: string;
  dueDate?: string;
  priority?: string;
  description?: string;
}): string {
  const due = opts.dueDate
    ? `<p style="color: #FF6F59; font-size: 14px; margin: 0 0 4px;">Due: ${opts.dueDate}</p>`
    : '';
  const priority = opts.priority
    ? `<p style="font-size: 13px; color: #666;">Priority: ${opts.priority}</p>`
    : '';
  const desc = opts.description
    ? `<p style="font-size: 13px; color: #666;">${opts.description}</p>`
    : '';

  return wrap('TaskFlow Reminder', `
    <h3 style="color: #153543; margin: 0 0 8px;">${opts.taskName}</h3>
    ${due}${priority}${desc}
  `);
}

/** Client follow-up reminder notification */
export function clientFollowUpEmail(opts: {
  clientName: string;
  status: string;
  followUpDate: string;
  nextSteps: string;
}): string {
  return wrap('Client Follow-up', `
    <h3 style="color: #153543; margin: 0 0 4px;">${opts.clientName}</h3>
    <p style="color: #49A3CC; font-size: 13px; margin: 0 0 12px;">Status: ${opts.status} · Follow-up: ${opts.followUpDate}</p>
    ${nextStepsBlock(opts.nextSteps)}
  `);
}
