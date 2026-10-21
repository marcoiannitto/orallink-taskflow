import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createActivityTable } from '@/lib/activity';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Only allow setup if table ID isn't already configured
  if (process.env.AIRTABLE_ACTIVITY_TABLE_ID) {
    return NextResponse.json({
      ok: true,
      message: 'Activity table already configured',
      tableId: process.env.AIRTABLE_ACTIVITY_TABLE_ID,
    });
  }

  const tableId = await createActivityTable();
  if (tableId) {
    return NextResponse.json({
      ok: true,
      message: 'Activity Log table created. Add AIRTABLE_ACTIVITY_TABLE_ID to your environment variables.',
      tableId,
    });
  }

  return NextResponse.json(
    {
      ok: false,
      message:
        'Could not create table automatically. Please create an "Activity Log" table in Airtable with fields: Timestamp (DateTime), User (Single line text), Action (Single select: create_client, update_client, create_task), Entity (Single line text), Details (Long text). Then set AIRTABLE_ACTIVITY_TABLE_ID in Vercel env vars.',
    },
    { status: 500 }
  );
}
