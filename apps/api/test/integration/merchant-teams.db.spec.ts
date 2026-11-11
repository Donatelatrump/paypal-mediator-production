import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { CoreModule } from '../../src/common/core.module.js';
import { parseEnvironment } from '../../src/common/config/environment.js';
import { ApiExceptionFilter } from '../../src/common/http/api-exception.filter.js';
import { PrismaService } from '../../src/common/database/prisma.service.js';
import { MerchantsModule } from '../../src/modules/merchants/merchants.module.js';
import { createMockAuth } from '../fixtures/auth.js';

// Real module, signed JWT/JWKS and PostgreSQL. No PayPal, SMTP or production writes.
@Module({})
class TeamTestModule {}
describe('Merchant teams HTTP + PostgreSQL', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let issuer: Awaited<ReturnType<typeof createMockAuth>>;
  const owner = randomUUID(),
    invitee = randomUUID(),
    outsider = randomUUID();
  const email = `${randomUUID()}@teams.test`;
  let ownerToken: string, inviteeToken: string, outsiderToken: string;
  let teamA: string, teamB: string, invitationId: string;
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL)
      throw new Error('TEST_DATABASE_URL is required');
    issuer = await createMockAuth();
    const environment = parseEnvironment({
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      SUPABASE_URL: issuer.origin,
      MERCHANT_ID: randomUUID(),
    });
    app = await NestFactory.create<NestExpressApplication>(
      {
        module: TeamTestModule,
        imports: [CoreModule.register(environment), MerchantsModule],
      },
      { logger: false, abortOnError: false },
    );
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    ownerToken = await issuer.token(owner, { email: 'owner@teams.test' });
    inviteeToken = await issuer.token(invitee, { email });
    outsiderToken = await issuer.token(outsider, { email: 'other@teams.test' });
  });
  afterAll(async () => {
    if (prisma && teamA) {
      const where = { merchantId: { in: [teamA, teamB].filter(Boolean) } };
      await prisma.merchantInvitation.deleteMany({ where });
      await prisma.merchantEvent.deleteMany({ where });
      await prisma.merchantMember.deleteMany({ where });
      await prisma.merchant.deleteMany({ where: { id: where.merchantId } });
    }
    await app?.close();
    await issuer?.close();
  });
  const api = () => request(app.getHttpServer());
  it('authenticates account routes before any membership lookup', async () => {
    for (const path of ['/api/merchants', '/api/merchant-invitations'])
      await api().get(path).expect(401);
    await api()
      .post('/api/merchants')
      .send({ displayName: 'Unauthorized' })
      .expect(401);
  });
  it('returns an empty list for an authenticated first-time user', async () => {
    const response = await api()
      .get('/api/merchants')
      .auth(ownerToken, { type: 'bearer' })
      .expect(200);
    expect(response.body).toEqual({ items: [] });
  });
  it('creates multiple teams with an atomic admin membership and conservative policy', async () => {
    for (const displayName of ['First team', 'Second team']) {
      const response = await api()
        .post('/api/merchants')
        .auth(ownerToken, { type: 'bearer' })
        .send({ displayName })
        .expect(201);
      expect(response.body).toMatchObject({
        displayName,
        role: 'ADMIN',
        policy: {
          allowInvestigations: false,
          allowSubmissions: false,
          requireMerchantApproval: true,
        },
      });
      if (!teamA) teamA = response.body.id;
      else teamB = response.body.id;
      expect(
        await prisma.merchantMember.count({
          where: {
            merchantId: response.body.id,
            authUserId: owner,
            role: 'ADMIN',
            active: true,
          },
        }),
      ).toBe(1);
    }
    const response = await api()
      .get('/api/merchants')
      .auth(ownerToken, { type: 'bearer' })
      .expect(200);
    expect(response.body.items.map((team: { id: string }) => team.id)).toEqual([
      teamA,
      teamB,
    ]);
    await api()
      .post('/api/merchants')
      .auth(ownerToken, { type: 'bearer' })
      .send({ displayName: '', role: 'ADMIN' })
      .expect(400);
  });
  it('requires explicit selection for multiple teams and rejects invalid or unauthorized IDs', async () => {
    const response = await api()
      .get('/api/merchants/me')
      .auth(ownerToken, { type: 'bearer' })
      .expect(400);
    expect(response.body.code).toBe('MERCHANT_SELECTION_REQUIRED');
    await api()
      .get('/api/merchants/me')
      .auth(ownerToken, { type: 'bearer' })
      .set('X-Merchant-Id', 'invalid')
      .expect(400);
    await api()
      .get('/api/merchants/me')
      .auth(outsiderToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamA)
      .expect(403);
    const selected = await api()
      .get('/api/merchants/me')
      .auth(ownerToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamB)
      .expect(200);
    expect(selected.body.id).toBe(teamB);
  });
  it('isolates settings, members and resources by selected team', async () => {
    await api()
      .patch('/api/merchants/me/settings')
      .auth(ownerToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamB)
      .send({ displayName: 'Renamed second team' })
      .expect(200);
    expect(
      (await prisma.merchant.findUniqueOrThrow({ where: { id: teamA } }))
        .displayName,
    ).toBe('First team');
    const members = await api()
      .get('/api/merchants/members')
      .auth(ownerToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamA)
      .expect(200);
    expect(members.body.items).toHaveLength(1);
    expect(members.body.items[0].authUserId).toBe(owner);
    const integration = await api()
      .get('/api/settings/integrations')
      .auth(ownerToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamA)
      .expect(200);
    expect(integration.body.paypal.credentialsConfigured).toBe(false);
  });
  it('creates a normalized invitation and prevents duplicate pending invitations', async () => {
    const response = await api()
      .post('/api/merchants/invitations')
      .auth(ownerToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamA)
      .send({ email: email.toUpperCase(), role: 'VIEWER' })
      .expect(201);
    invitationId = response.body.id;
    expect(response.body.email).toBe(email);
    await api()
      .post('/api/merchants/invitations')
      .auth(ownerToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamA)
      .send({ email })
      .expect(409);
    const pending = await api()
      .get('/api/merchant-invitations')
      .auth(inviteeToken, { type: 'bearer' })
      .expect(200);
    expect(pending.body.items).toHaveLength(1);
    const hidden = await api()
      .get('/api/merchant-invitations')
      .auth(outsiderToken, { type: 'bearer' })
      .expect(200);
    expect(hidden.body.items).toEqual([]);
    expect(
      await prisma.merchantMember.count({ where: { authUserId: invitee } }),
    ).toBe(0);
  });
  it('rejects acceptance by another identity and consumes an invitation only once under concurrency', async () => {
    await api()
      .post(`/api/merchant-invitations/${invitationId}/accept`)
      .auth(outsiderToken, { type: 'bearer' })
      .expect(404);
    const results = await Promise.all(
      [0, 1].map(() =>
        api()
          .post(`/api/merchant-invitations/${invitationId}/accept`)
          .auth(inviteeToken, { type: 'bearer' }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 404]);
    expect(
      await prisma.merchantMember.count({
        where: { authUserId: invitee, merchantId: teamA },
      }),
    ).toBe(1);
    const joined = await api()
      .get('/api/merchants')
      .auth(inviteeToken, { type: 'bearer' })
      .expect(200);
    expect(joined.body.items[0]).toMatchObject({ id: teamA, role: 'VIEWER' });
  });
  it('enforces role per team on every request', async () => {
    await api()
      .post('/api/merchants/invitations')
      .auth(inviteeToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamA)
      .send({ email: 'someone@teams.test', role: 'ADMIN' })
      .expect(403);
    await api()
      .patch('/api/merchants/me/settings')
      .auth(inviteeToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamA)
      .send({ displayName: 'Forbidden' })
      .expect(403);
    await prisma.merchantMember.updateMany({
      where: { merchantId: teamA, authUserId: invitee },
      data: { active: false },
    });
    await api()
      .get('/api/merchants/me')
      .auth(inviteeToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamA)
      .expect(403);
  });
  it('rejects expired and revoked invitations, including cross-team revocation', async () => {
    const invited = await api()
      .post('/api/merchants/invitations')
      .auth(ownerToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamB)
      .send({ email })
      .expect(201);
    await api()
      .delete(`/api/merchants/invitations/${invited.body.id}`)
      .auth(ownerToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamA)
      .expect(404);
    await api()
      .delete(`/api/merchants/invitations/${invited.body.id}`)
      .auth(ownerToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamB)
      .expect(204);
    await api()
      .post(`/api/merchant-invitations/${invited.body.id}/accept`)
      .auth(inviteeToken, { type: 'bearer' })
      .expect(404);
    const expired = await api()
      .post('/api/merchants/invitations')
      .auth(ownerToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamB)
      .send({ email })
      .expect(201);
    await prisma.merchantInvitation.update({
      where: { id: expired.body.id },
      data: { expiresAt: new Date(0) },
    });
    await api()
      .post(`/api/merchant-invitations/${expired.body.id}/accept`)
      .auth(inviteeToken, { type: 'bearer' })
      .expect(404);
  });
  it('does not change an active member role through invitation acceptance', async () => {
    const invite = await api()
      .post('/api/merchants/invitations')
      .auth(ownerToken, { type: 'bearer' })
      .set('X-Merchant-Id', teamA)
      .send({ email: 'owner@teams.test', role: 'VIEWER' })
      .expect(201);
    const accepted = await api()
      .post(`/api/merchant-invitations/${invite.body.id}/accept`)
      .auth(ownerToken, { type: 'bearer' })
      .expect(200);
    expect(accepted.body.role).toBe('ADMIN');
  });
  it('enforces one membership per user per team at the database level', async () => {
    await expect(
      prisma.merchantMember.create({
        data: { merchantId: teamA, authUserId: owner, role: 'ADMIN' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
  it('rolls back team creation if its event cannot be persisted', async () => {
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION reject_team_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'TEAM_CREATED' THEN RAISE EXCEPTION 'test event failure'; END IF; RETURN NEW; END; $$`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER reject_team_event BEFORE INSERT ON merchant_events FOR EACH ROW EXECUTE FUNCTION reject_team_event()`,
    );
    try {
      const before = await prisma.merchant.count();
      await api()
        .post('/api/merchants')
        .auth(ownerToken, { type: 'bearer' })
        .send({ displayName: 'Must roll back' })
        .expect(500);
      expect(await prisma.merchant.count()).toBe(before);
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER reject_team_event ON merchant_events`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION reject_team_event()`);
    }
  });
  it('denies direct invitation reads via non-owner database roles', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL ROLE pg_read_all_data`;
      expect(await tx.$queryRaw`SELECT id FROM merchant_invitations`).toEqual(
        [],
      );
    });
  });
});
