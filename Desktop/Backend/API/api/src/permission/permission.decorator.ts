// permission.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PermissionName = (name: string) => SetMetadata('permission', name);
