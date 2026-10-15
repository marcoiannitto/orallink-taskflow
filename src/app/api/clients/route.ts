import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getClients } from '@/lib/airtable';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const clients = await getClients();
    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Clients fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}
