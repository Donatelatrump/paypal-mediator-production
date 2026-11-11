import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { z } from 'zod';
import type { MerchantRole } from '@resolve-ai/contracts';
import { PrismaService } from '../../../common/database/prisma.service.js';
import { ApiException } from '../../../common/http/api.exception.js';
import { SupabaseAuthService } from './supabase-auth.service.js';

export interface MerchantActor {
  userId: string;
  merchantId: string;
  role: MerchantRole;
}
export type MerchantRequest = Request & { merchantActor: MerchantActor };
const ADMIN_ONLY = 'merchants:admin-only';
export const MerchantAdminOnly = () => SetMetadata(ADMIN_ONLY, true);

@Injectable()
export class MerchantAccessGuard implements CanActivate {
  constructor(
    @Inject(SupabaseAuthService) private readonly auth: SupabaseAuthService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<MerchantRequest>();
    const userId = await this.auth.authenticate(request.headers.authorization);

    // Selection never grants access: verify current membership on every request.
    const selected = request.headers['x-merchant-id'];
    if (selected !== undefined && !z.uuid().safeParse(selected).success) {
      throw new ApiException(
        'INVALID_MERCHANT_ID',
        'X-Merchant-Id must be a single team UUID',
        400,
      );
    }
    let member;
    if (typeof selected === 'string') {
      member = await this.prisma.merchantMember.findFirst({
        where: { authUserId: userId, active: true, merchantId: selected },
      });
    } else {
      const memberships = await this.prisma.merchantMember.findMany({
        where: { authUserId: userId, active: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 2,
      });
      if (memberships.length > 1) {
        throw new ApiException(
          'MERCHANT_SELECTION_REQUIRED',
          'Select a team using X-Merchant-Id',
          400,
        );
      }
      member = memberships[0];
    }
    if (!member) {
      throw new ApiException(
        'MERCHANT_ACCESS_DENIED',
        'Access to this merchant is not authorized',
        403,
      );
    }
    const { merchantId, role } = member;

    const adminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (adminOnly && role !== 'ADMIN') {
      throw new ApiException(
        'MERCHANT_ADMIN_REQUIRED',
        'A merchant administrator is required',
        403,
      );
    }
    request.merchantActor = {
      userId,
      merchantId,
      role,
    };
    return true;
  }
}
