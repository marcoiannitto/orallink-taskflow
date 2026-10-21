import Airtable, { FieldSet } from 'airtable';
import { AIRTABLE, TEAM_MEMBERS } from './constants';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  AIRTABLE.BASE_ID
);

export const tasksTable = base(AIRTABLE.TABLES.TASKS);
export const clientsTable = base(AIRTABLE.TABLES.CLIENTS);
export const teamTable = base(AIRTABLE.TABLES.TEAM);

export interface TaskRecord {
  id: string;
  task: string;
  clientId?: string[];
  responsible?: string;
  dueDate?: string;
  status?: string;
  priority?: string;
  type?: string;
  description?: string;
  notificationSent?: boolean;
  sourceInput?: string;
  createdBy?: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  status?: string;
  responsible: string[];
  nextFollowUp?: string;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  clientType?: string;
  [key: string]: unknown;
}

const F = AIRTABLE.FIELDS;

/**
 * Resolve the CLIENT_RESPONSIBLE field to team member names.
 * Linked record fields return an array of record IDs, e.g. ['reccUGXtnEVZUWj6X'].
 * We match them against TEAM_MEMBERS.recordId to get the name.
 * Also handles legacy single-string or multi-select (name strings) gracefully.
 */
function resolveResponsible(val: unknown): string[] {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr
    .map((v) => {
      if (typeof v !== 'string') return null;
      // If it looks like a record ID, resolve to name
      if (v.startsWith('rec')) {
        const member = TEAM_MEMBERS.find((m) => m.recordId === v);
        return member?.name || null;
      }
      // Otherwise treat as a name string (legacy/multi-select)
      return v.trim() || null;
    })
    .filter((n): n is string => n !== null);
}

/** Convert team member names to their Airtable record IDs for linked record writes */
export function namesToRecordIds(names: string[]): string[] {
  return names
    .map((n) => TEAM_MEMBERS.find((m) => m.name.toLowerCase() === n.toLowerCase()))
    .filter(Boolean)
    .map((m) => m!.recordId);
}

export async function getTasks(filterFormula?: string): Promise<TaskRecord[]> {
  const options: Record<string, unknown> = {
    sort: [{ field: F.TASK_DUE_DATE, direction: 'asc' }],
    returnFieldsByFieldId: true,
  };
  if (filterFormula) options.filterByFormula = filterFormula;

  const records = await tasksTable.select(options as Airtable.SelectOptions<FieldSet>).all();
  return records.map((r) => ({
    id: r.id,
    task: (r.get(F.TASK) as string) || '',
    clientId: r.get(F.TASK_CLIENTS) as string[] | undefined,
    responsible: r.get(F.TASK_RESPONSIBLE) as string | undefined,
    dueDate: r.get(F.TASK_DUE_DATE) as string | undefined,
    status: r.get(F.TASK_STATUS) as string | undefined,
    priority: r.get(F.TASK_PRIORITY) as string | undefined,
    type: r.get(F.TASK_TYPE) as string | undefined,
    description: r.get(F.TASK_DESCRIPTION) as string | undefined,
    notificationSent: r.get(F.TASK_NOTIFICATION_SENT) as boolean | undefined,
    sourceInput: r.get(F.TASK_SOURCE_INPUT) as string | undefined,
    createdBy: r.get(F.TASK_CREATED_BY) as string | undefined,
  }));
}

export async function createTask(fields: Partial<FieldSet>) {
  return tasksTable.create([{ fields }]);
}

export async function updateTask(id: string, fields: Partial<FieldSet>) {
  return tasksTable.update(id, fields);
}

export async function getClients(filterFormula?: string): Promise<ClientRecord[]> {
  const options: Record<string, unknown> = {
    returnFieldsByFieldId: true,
  };
  if (filterFormula) options.filterByFormula = filterFormula;

  const records = await clientsTable.select(options as Airtable.SelectOptions<FieldSet>).all();
  return records.map((r) => ({
    id: r.id,
    name: (r.get(F.CLIENT_NAME) as string) || '',
    status: r.get(F.CLIENT_STATUS) as string | undefined,
    responsible: resolveResponsible(r.get(F.CLIENT_RESPONSIBLE)),
    nextFollowUp: r.get(F.CLIENT_NEXT_FOLLOWUP) as string | undefined,
    notes: r.get(F.CLIENT_NOTES) as string | undefined,
    contactName: r.get(F.CLIENT_CONTACT_NAME) as string | undefined,
    contactEmail: r.get(F.CLIENT_CONTACT_EMAIL) as string | undefined,
    clientType: r.get(F.CLIENT_TYPE) as string | undefined,
  }));
}

export async function createClient(fields: Partial<FieldSet>) {
  return clientsTable.create([{ fields }]);
}

export async function getClientById(id: string): Promise<ClientRecord | null> {
  try {
    const records = await clientsTable.select({
      returnFieldsByFieldId: true,
      filterByFormula: `RECORD_ID() = '${id}'`,
      maxRecords: 1,
    } as Airtable.SelectOptions<FieldSet>).all();
    if (records.length === 0) return null;
    const r = records[0];
    return {
      id: r.id,
      name: (r.get(F.CLIENT_NAME) as string) || '',
      status: r.get(F.CLIENT_STATUS) as string | undefined,
      responsible: resolveResponsible(r.get(F.CLIENT_RESPONSIBLE)),
      nextFollowUp: r.get(F.CLIENT_NEXT_FOLLOWUP) as string | undefined,
      notes: r.get(F.CLIENT_NOTES) as string | undefined,
      contactName: r.get(F.CLIENT_CONTACT_NAME) as string | undefined,
      contactEmail: r.get(F.CLIENT_CONTACT_EMAIL) as string | undefined,
      clientType: r.get(F.CLIENT_TYPE) as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function updateClient(id: string, fields: Partial<FieldSet>) {
  return clientsTable.update(id, fields);
}

export async function getTasksDueSoon(): Promise<TaskRecord[]> {
  // filterByFormula requires field NAMES, not field IDs
  // (returnFieldsByFieldId only affects r.get() return values)
  return getTasks(
    `AND(IS_BEFORE({Due Date}, DATEADD(NOW(), 1, 'hours')), {Notification Sent} = FALSE(), {Status} != 'Done')`
  );
}

export async function getClientsDueFollowUp(): Promise<ClientRecord[]> {
  // filterByFormula requires field NAMES, not field IDs
  return getClients(
    `AND(IS_BEFORE({Next Follow-up}, DATEADD(TODAY(), 1, 'days')), {Next Follow-up} != BLANK(), {Status} != 'Inactive')`
  );
}
