import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseAuthService } from './supabase-auth.service.js';
export interface AccountIdentity {
  userId: string;
  email?: string;
}
export type AccountRequest = Request & { accountIdentity: AccountIdentity };
@Injectable()
export class AccountAccessGuard implements CanActivate {
  constructor(
    @Inject(SupabaseAuthService) private readonly auth: SupabaseAuthService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AccountRequest>();
    request.accountIdentity = await this.auth.authenticateIdentity(
      request.headers.authorization,
    );
    return true;
  }
}
