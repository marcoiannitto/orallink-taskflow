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
  BASE_ID: 'appS0SeEmjrtNYcIG',
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
