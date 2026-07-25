import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail } from '../../../../common/validation/normalize-email.transform';

export class RegisterDto {
  @ApiProperty({ example: 'dev@example.com', maxLength: 320 })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'uma-senha-forte', minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
