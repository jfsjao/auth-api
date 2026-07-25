import type { UserRole } from '../../users';

export const ROLE_PERMISSIONS: Record<UserRole, readonly string[]> = {
  user: ['profile:read:self', 'profile:update:self'],
  admin: [
    'profile:read:self',
    'profile:update:self',
    'users:read:any',
    'users:update:any',
  ],
};

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: UserRole;
  permissions: readonly string[];
}
