'use client';

import { useEffect, useState } from 'react';

export type PermissionLevel = 'admin' | 'member' | 'intern';

export interface CurrentUser {
  name: string;
  email: string;
  role: string;
  permission: PermissionLevel;
  recordId: string;
}

const PERMISSION_RANK: Record<PermissionLevel, number> = {
  admin: 3,
  member: 2,
  intern: 1,
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  /** Check if the current user has at least the given permission level */
  function hasPermission(required: PermissionLevel): boolean {
    if (!user) return false;
    return PERMISSION_RANK[user.permission || 'member'] >= PERMISSION_RANK[required];
  }

  return { user, loading, hasPermission };
}
