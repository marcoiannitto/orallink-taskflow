import Airtable, { FieldSet } from 'airtable';
import { AIRTABLE, TEAM_MEMBERS } from './constants';

// Lazy-init to avoid build-time error when AIRTABLE_API_KEY isn't set
let _base: ReturnType<InstanceType<typeof Airtable>['base']> | null = null;
function getBase() {
  if (!_base) {
    _base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(AIRTABLE.BASE_ID);
  }
  return _base;
}

function getTableId(): string {
  return process.env.AIRTABLE_ACTIVITY_TABLE_ID || '';
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  user: string;
  action: 'create_client' | 'update_client' | 'create_task' | string;
  entityName: string;
  details: string;
}

/**
 * Log an activity entry to Airtable (non-blocking, fire-and-forget).
 * Silently fails if the activity table isn't configured.
 */
export function logActivity(entry: {
  user: string;
  action: string;
  entityName: string;
  details: string;
}): void {
  const tableId = getTableId();
  if (!tableId) return;

  const table = getBase()(tableId);
  table
    .create([
      {
        fields: {
          Timestamp: new Date().toISOString(),
          User: entry.user,
          Action: entry.action,
          Entity: entry.entityName,
          Details: entry.details,
        },
      },
    ])
    .catch((err) => {
      console.error('Activity log write failed:', err);
    });
}

/**
 * Fetch recent activity entries, newest first.
 */
export async function getActivityLog(options?: {
  limit?: number;
  user?: string;
  action?: string;
}): Promise<ActivityEntry[]> {
  const tableId = getTableId();
  if (!tableId) return [];

  const table = getBase()(tableId);
  const queryOpts: Record<string, unknown> = {
    sort: [{ field: 'Timestamp', direction: 'desc' }],
    maxRecords: options?.limit || 50,
  };

  const filters: string[] = [];
  if (options?.user) {
    filters.push(`{User} = "${options.user}"`);
  }
  if (options?.action) {
    filters.push(`{Action} = "${options.action}"`);
  }
  if (filters.length > 0) {
    queryOpts.filterByFormula =
      filters.length === 1 ? filters[0] : `AND(${filters.join(', ')})`;
  }

  const records = await table
    .select(queryOpts as Airtable.SelectOptions<FieldSet>)
    .all();

  return records.map((r) => ({
    id: r.id,
    timestamp: (r.get('Timestamp') as string) || '',
    user: (r.get('User') as string) || '',
    action: (r.get('Action') as string) || '',
    entityName: (r.get('Entity') as string) || '',
    details: (r.get('Details') as string) || '',
  }));
}

/**
 * Create the Activity Log table in Airtable via the metadata API.
 * Requires a token with `schema.bases:write` scope.
 * Returns the new table ID on success, or null on failure.
 */
export async function createActivityTable(): Promise<string | null> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/meta/bases/${AIRTABLE.BASE_ID}/tables`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Activity Log',
          fields: [
            { name: 'Timestamp', type: 'dateTime', options: { timeZone: 'Asia/Singapore', dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' } } },
            { name: 'User', type: 'singleLineText' },
            { name: 'Action', type: 'singleSelect', options: { choices: [
              { name: 'create_client', color: 'greenLight2' },
              { name: 'update_client', color: 'blueLight2' },
              { name: 'create_task', color: 'purpleLight2' },
            ] } },
            { name: 'Entity', type: 'singleLineText' },
            { name: 'Details', type: 'multilineText' },
          ],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Failed to create Activity Log table:', err);
      return null;
    }

    const data = await res.json();
    return data.id || null;
  } catch (err) {
    console.error('Activity table creation error:', err);
    return null;
  }
}

/** Return the list of team member names for filters */
export function getTeamNames(): string[] {
  return TEAM_MEMBERS.map((m) => m.name);
}
