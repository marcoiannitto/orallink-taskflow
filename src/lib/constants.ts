// OralLink Design Tokens
export const COLORS = {
  lightBlue: '#E2F0F6',
  darkTeal: '#153543',
  lightGray: '#F7F7F7',
  blue: '#49A3CC',
  gray: '#D1D5DB',
  coral: '#FF6F59',
  green: '#A3D9A5',
  white: '#FFFFFF',
} as const;

// Airtable IDs
export const AIRTABLE = {
  BASE_ID: process.env.AIRTABLE_BASE_ID || 'appS0SeEmjrtNYcIG',
  TABLES: {
    CLIENTS: 'tbl4yCDp1KnCSGHZM',
    TASKS: 'tbldt0lsrKzPJBt6i',
    TEAM: 'tbl38zi1EdOYSVHTf',
  },
  FIELDS: {
    // Tasks table
    TASK: 'fldAUDoNyDdxdKonq',
    TASK_CLIENTS: 'fldFXXKzU5Wcw9SIh',
    TASK_RESPONSIBLE: 'fld6watjR7v0bq7ef',
    TASK_DUE_DATE: 'fldfhIUTQAWsVCIlh',
    TASK_STATUS: 'fldk2YWG5pSF4AtkV',
    TASK_PRIORITY: 'fldftvYX4gX9y3Dby',
    TASK_TYPE: 'fld6xJGXMtvJsiTr2',
    TASK_DESCRIPTION: 'fldGc1eYxA8Wh6kUe',
    TASK_NOTIFICATION_SENT: 'fldmHjBalWFA290wV',
    TASK_SOURCE_INPUT: 'fldmVSKd9AqXjJhQC',
    TASK_CREATED_BY: 'fldDjwNasmlBRqKll',
    // Clients table
    CLIENT_NAME: 'fldPsiV6zBEI4QJD9',
    CLIENT_STATUS: 'fldpG3pEiQHzNxWfB',
    CLIENT_NOTES: 'fldayk1MiygtAmbfW',
    CLIENT_NEXT_FOLLOWUP: 'fldrYWVJOwp33QDM6',
    CLIENT_PILOT_DATE: 'fldv3FHTtbhYRWIG5',
    CLIENT_LAUNCH_DATE: 'fldT5S39Ez6a2nFkO',
    CLIENT_SCANS_MONTH: 'fldEeK6ajyZIkoRsl',
    CLIENT_RESPONSIBLE: 'fldJlDktDTUeVEBgd',
    CLIENT_CONTACT_NAME: 'fldr8GFuibA7VUWYS',
    CLIENT_TYPE: 'fldeQ8DgQjiWW7DIT',
    CLIENT_PRICE: 'fldRsR0OBwpoZnX4R',
    CLIENT_BILLING_CYCLE: 'fldbpszRVxJyRHo0U',
    CLIENT_DATE_CREATED: 'fldpEqVjbTLh3anbZ',
    CLIENT_CONTACT_EMAIL: 'fldFfilMdwdiVbhhF',
    CLIENT_BILLING_EMAIL: 'fldMSDYd5t3SUAeSa',
    CLIENT_UEN: 'fldEPeQNiaMU21vuw',
    CLIENT_EMAIL_DOMAIN: 'fldAcLlXkhd5K1eqU',
    CLIENT_WELCOME_EMAIL_SENT: 'fldvvSR0vPNxZdcFE',
    CLIENT_WELCOME_EMAIL_DATE: 'fldSBp7zJKVRnQUZD',
    CLIENT_TASKS: 'fldDQv9uYFZwSuFTc',
    // Team table
    TEAM_NAME: 'fldJGyR9jcnZdZUx3',
    TEAM_ROLE: 'fld3pPjabHj6ap0oi',
    TEAM_EMAIL: 'fldzbie6sd4ux5WQ3',
    TEAM_PHONE: 'fldTvYQx1gbA9pMaK',
  },
} as const;

// Team members for auth
export const TEAM_MEMBERS = [
  { name: 'Marco', role: 'COO', email: 'marco@orallink.health', recordId: 'reccUGXtnEVZUWj6X' },
  { name: 'Jeremy', role: 'CFO', email: 'jeremy@orallink.health', recordId: 'rec6dRcjDvG5l1WTg' },
  { name: 'Glenn', role: 'CEO', email: 'glenn@orallink.health', recordId: 'recBToP1ZSFnooWIL' },
  { name: 'Gerald', role: 'COO', email: 'gerald@orallink.health', recordId: 'rec1TBtic3r5086Oq' },
  { name: 'Matthew', role: 'Intern', email: 'matthew@orallink.health', recordId: 'recdYW5szjOfXWSKH' },
  { name: 'Yee Kai', role: 'Intern', email: 'yeekai@orallink.health', recordId: 'recCwwb5ou2nBZ4wW' },
] as const;

export const JWT_SECRET = process.env.JWT_SECRET || 'orallink-taskflow-dev-secret';
