import { Inject, Injectable } from '@nestjs/common';
import {
  MerchantResponseSchema,
  MerchantInvitationSchema,
  MerchantInvitationListSchema,
  MerchantMemberListSchema,
  type CreateMerchant,
  type InviteMerchantMember,
} from '@resolve-ai/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { ApiException } from '../../common/http/api.exception.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { MerchantActor } from './auth/merchant-access.guard.js';
import type { AccountIdentity } from './auth/account-access.guard.js';

const invitationResponse = (invitation: {
  id: string;
  merchantId: string;
  email: string;
  role: string;
  expiresAt: Date;
  merchant: { displayName: string };
}) =>
  MerchantInvitationSchema.parse({
    ...invitation,
    displayName: invitation.merchant.displayName,
    expiresAt: invitation.expiresAt.toISOString(),
  });

@Injectable()
export class MerchantTeamsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(identity: AccountIdentity, input: CreateMerchant) {
    return this.prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: {
          displayName: input.displayName,
          members: { create: { authUserId: identity.userId, role: 'ADMIN' } },
          events: {
            create: {
              actorUserId: identity.userId,
              action: 'TEAM_CREATED',
              details: {},
            },
          },
        },
      });
      return MerchantResponseSchema.parse({
        ...merchant,
        role: 'ADMIN',
        policy: merchant,
      });
    });
  }

  private async lockTeam(tx: Prisma.TransactionClient, merchantId: string) {
    await tx.$queryRaw`SELECT id FROM merchants WHERE id = ${merchantId}::uuid FOR UPDATE`;
  }

  private async requireAdmin(
    tx: Prisma.TransactionClient,
    actor: MerchantActor,
  ) {
    await this.lockTeam(tx, actor.merchantId);
    const admin = await tx.merchantMember.findFirst({
      where: {
        merchantId: actor.merchantId,
        authUserId: actor.userId,
        active: true,
        role: 'ADMIN',
      },
    });
    if (!admin)
      throw new ApiException(
        'MERCHANT_ADMIN_REQUIRED',
        'A merchant administrator is required',
        403,
      );
  }

  async members(actor: MerchantActor) {
    const members = await this.prisma.merchantMember.findMany({
      where: { merchantId: actor.merchantId, active: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return MerchantMemberListSchema.parse({
      items: members.map((member) => ({
        ...member,
        createdAt: member.createdAt.toISOString(),
      })),
    });
  }

  async invite(actor: MerchantActor, input: InviteMerchantMember) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireAdmin(tx, actor);
      const pending = await tx.merchantInvitation.findFirst({
        where: {
          merchantId: actor.merchantId,
          email: input.email,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (pending)
        throw new ApiException(
          'INVITATION_EXISTS',
          'A pending invitation already exists for this email',
          409,
        );
      const invitation = await tx.merchantInvitation.create({
        data: {
          merchantId: actor.merchantId,
          email: input.email,
          role: input.role,
          invitedBy: actor.userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        include: { merchant: true },
      });
      await tx.merchantEvent.create({
        data: {
          merchantId: actor.merchantId,
          actorUserId: actor.userId,
          action: 'MEMBER_INVITED',
          details: {},
        },
      });
      return invitationResponse(invitation);
    });
  }

  async invitations(actor: MerchantActor) {
    const invitations = await this.prisma.merchantInvitation.findMany({
      where: {
        merchantId: actor.merchantId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { merchant: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return MerchantInvitationListSchema.parse({
      items: invitations.map(invitationResponse),
    });
  }

  async pending(identity: AccountIdentity) {
    if (!identity.email) return { items: [] };
    const invitations = await this.prisma.merchantInvitation.findMany({
      where: {
        email: identity.email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { merchant: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return MerchantInvitationListSchema.parse({
      items: invitations.map(invitationResponse),
    });
  }

  async accept(identity: AccountIdentity, id: string) {
    return this.prisma.$transaction(async (tx) => {
      // Identity/email are supplied only by the verified Supabase token.
      const invitation = await tx.merchantInvitation.findFirst({
        where: {
          id,
          email: identity.email ?? '',
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { merchant: true },
      });
      if (!invitation)
        throw new ApiException(
          'INVITATION_NOT_FOUND',
          'The invitation is unavailable',
          404,
        );
      await this.lockTeam(tx, invitation.merchantId);
      const consumed = await tx.merchantInvitation.updateMany({
        where: {
          id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { acceptedAt: new Date() },
      });
      if (consumed.count !== 1)
        throw new ApiException(
          'INVITATION_NOT_FOUND',
          'The invitation is unavailable',
          404,
        );
      const existing = await tx.merchantMember.findUnique({
        where: {
          merchantId_authUserId: {
            merchantId: invitation.merchantId,
            authUserId: identity.userId,
          },
        },
      });
      // An invitation cannot silently promote or downgrade an existing member.
      const member = existing?.active
        ? existing
        : await tx.merchantMember.upsert({
            where: {
              merchantId_authUserId: {
                merchantId: invitation.merchantId,
                authUserId: identity.userId,
              },
            },
            create: {
              merchantId: invitation.merchantId,
              authUserId: identity.userId,
              role: invitation.role,
            },
            update: { active: true, role: invitation.role },
          });
      await tx.merchantEvent.create({
        data: {
          merchantId: invitation.merchantId,
          actorUserId: identity.userId,
          action: 'MEMBER_JOINED',
          details: {},
        },
      });
      return MerchantResponseSchema.parse({
        ...invitation.merchant,
        role: member.role,
        policy: invitation.merchant,
      });
    });
  }

  async revoke(actor: MerchantActor, id: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.requireAdmin(tx, actor);
      const revoked = await tx.merchantInvitation.updateMany({
        where: {
          id,
          merchantId: actor.merchantId,
          acceptedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      if (revoked.count !== 1)
        throw new ApiException(
          'INVITATION_NOT_FOUND',
          'The invitation is unavailable',
          404,
        );
      await tx.merchantEvent.create({
        data: {
          merchantId: actor.merchantId,
          actorUserId: actor.userId,
          action: 'INVITATION_REVOKED',
          details: {},
        },
      });
    });
  }
}
