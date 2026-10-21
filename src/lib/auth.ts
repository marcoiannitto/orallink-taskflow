import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { TEAM_MEMBERS, JWT_SECRET, hasPermission } from './constants';
import type { PermissionLevel } from './constants';

export type TeamMember = (typeof TEAM_MEMBERS)[number];

export interface JWTPayload {
  email: string;
  name: string;
  role: string;
  permission: PermissionLevel;
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
      permission: member.permission,
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

/**
 * Check if the current user meets the required permission level.
 * Returns the user if authorized, or a 401/403 NextResponse if not.
 */
export async function requireRole(
  required: PermissionLevel
): Promise<JWTPayload | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  // Backcompat: old JWTs without permission field default based on role
  const userPermission: PermissionLevel =
    user.permission || inferPermission(user.role);
  if (!hasPermission(userPermission, required)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  return user;
}

/** Infer permission from role string (for old JWTs minted before this change) */
function inferPermission(role: string): PermissionLevel {
  const lower = role.toLowerCase();
  if (['ceo', 'coo'].includes(lower)) return 'admin';
  if (lower === 'intern') return 'intern';
  return 'member';
}
