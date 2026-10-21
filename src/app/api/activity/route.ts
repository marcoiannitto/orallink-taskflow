import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getActivityLog, getTeamNames } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(req.url);
  const filterUser = url.searchParams.get('user') || undefined;
  const filterAction = url.searchParams.get('action') || undefined;
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 200);

  try {
    const entries = await getActivityLog({ limit, user: filterUser, action: filterAction });
    const teamNames = getTeamNames();
    return NextResponse.json({ entries, teamNames });
  } catch (error) {
    console.error('Activity fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 });
  }
}
