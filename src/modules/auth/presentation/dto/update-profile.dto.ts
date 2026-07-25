import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { normalizeEmail } from '../../../../common/validation/normalize-email.transform';

export class UpdateProfileDto {
  @ApiProperty({ example: 'novo@example.com', maxLength: 320 })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
