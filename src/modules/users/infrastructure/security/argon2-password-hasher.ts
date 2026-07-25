import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import argon2 from 'argon2';
import { PasswordHasherPort } from '../../domain/ports/password-hasher.port';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasherPort {
  constructor(private readonly config: ConfigService) {}

  hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.config.get<number>('PASSWORD_HASH_MEMORY_COST', 65536),
      timeCost: this.config.get<number>('PASSWORD_HASH_TIME_COST', 3),
      parallelism: this.config.get<number>('PASSWORD_HASH_PARALLELISM', 1),
    });
  }

  verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
