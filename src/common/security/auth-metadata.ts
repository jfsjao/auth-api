import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'is_public';
export const REQUIRED_PERMISSIONS = 'required_permissions';

export const Public = () => SetMetadata(IS_PUBLIC, true);
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);
