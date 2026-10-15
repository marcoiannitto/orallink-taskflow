import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { TEAM_MEMBERS, JWT_SECRET } from './constants';

export type TeamMember = (typeof TEAM_MEMBERS)[number];

interface JWTPayload {
  email: string;
  name: string;
  role: string;
  recordId: string;
}

export function authenticateUser(email: string, password: string): TeamMember | null {
  const member = TEAM_MEMBERS.find(
    (m) => m.email.toLowerCase() === email.toLowerCase()
  );
  // Simple password: orallink2026
  if (member && password === 'orallink2026') {
    return member;
  }
  return null;
}

export function createToken(member: TeamMember): string {
  return jwt.sign(
    {
      email: member.email,
      name: member.name,
      role: member.role,
      recordId: member.recordId,
    } satisfies JWTPayload,
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
