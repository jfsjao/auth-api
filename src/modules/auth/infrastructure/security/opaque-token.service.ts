import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';

@Injectable()
export class OpaqueTokenService {
  constructor(private readonly config: ConfigService) {}

  generate(): string {
    return randomBytes(48).toString('base64url');
  }

  hash(token: string): string {
    const pepper = this.config.getOrThrow<string>('REFRESH_TOKEN_PEPPER');
    return createHmac('sha256', pepper).update(token).digest('hex');
  }
}
