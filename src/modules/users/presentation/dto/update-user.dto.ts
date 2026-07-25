import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { USER_ROLES } from '../../domain/user';
import type { UserRole } from '../../domain/user';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'novo@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
