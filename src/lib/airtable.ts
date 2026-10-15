import Airtable, { FieldSet } from 'airtable';
import { AIRTABLE } from './constants';

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
  responsible?: string;
  nextFollowUp?: string;
  notes?: string;
  [key: string]: unknown;
}

const F = AIRTABLE.FIELDS;

export async function getTasks(filterFormula?: string): Promise<TaskRecord[]> {
  const options: Record<string, unknown> = {
    sort: [{ field: F.TASK_DUE_DATE, direction: 'asc' }],
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
  const options: Record<string, unknown> = {};
  if (filterFormula) options.filterByFormula = filterFormula;

  const records = await clientsTable.select(options as Airtable.SelectOptions<FieldSet>).all();
  return records.map((r) => {
    const fields: ClientRecord = {
      id: r.id,
      name: (r.get('Name') as string) || (r.get('Company') as string) || '',
      status: r.get('Status') as string | undefined,
      responsible: r.get('Responsible') as string | undefined,
    };
    // Include all other fields
    for (const [key, val] of Object.entries(r.fields)) {
      if (!(key in fields)) {
        fields[key] = val;
      }
    }
    return fields;
  });
}

export async function updateClient(id: string, fields: Partial<FieldSet>) {
  return clientsTable.update(id, fields);
}

export async function getTasksDueSoon(): Promise<TaskRecord[]> {
  return getTasks(
    `AND(IS_BEFORE({${F.TASK_DUE_DATE}}, DATEADD(NOW(), 1, 'hours')), {${F.TASK_NOTIFICATION_SENT}} = FALSE(), {${F.TASK_STATUS}} != 'Done')`
  );
}
