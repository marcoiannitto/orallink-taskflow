import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const member = authenticateUser(email, password);
  if (!member) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = createToken(member);
  const response = NextResponse.json({
    name: member.name,
    email: member.email,
    role: member.role,
  });

  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return response;
}
