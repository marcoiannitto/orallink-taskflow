import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { TEAM_MEMBERS } from '@/lib/constants';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  // Ensure permission is always present (backcompat for old tokens)
  const permission =
    user.permission ||
    TEAM_MEMBERS.find((m) => m.email === user.email)?.permission ||
    'member';
  return NextResponse.json({ ...user, permission });
}
