import 'reflect-metadata';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { parseEnvironment } from '../common/config/environment.js';
import { randomUUID } from 'crypto';

config({
  path: fileURLToPath(new URL('../../../../.env', import.meta.url)),
  quiet: false,
});

async function main() {
  console.log('🔧 Environment loaded:', {
    MERCHANT_ID: process.env.MERCHANT_ID,
    DATABASE_URL: process.env.DATABASE_URL?.slice(0, 50) + '...',
    NODE_ENV: process.env.NODE_ENV,
  });
  
  // Test parseEnvironment directly
  const { EnvironmentSchema } = await import('../common/config/environment.js');
  const testResult = EnvironmentSchema.safeParse({
    ...process.env,
    TRANSACTION_WORKER_ENABLED: process.env.TRANSACTION_WORKER_ENABLED ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false'),
    DISPUTE_WORKER_ENABLED: process.env.DISPUTE_WORKER_ENABLED ?? process.env.TRANSACTION_WORKER_ENABLED ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false'),
  });
  
  console.log('🧪 Schema validation:', testResult.success ? 'PASS' : 'FAIL');
  if (!testResult.success) {
    console.log('❌ Issues:', testResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
  }
  
  const environment = parseEnvironment(process.env);
  const MERCHANT_ID = '11111111-1111-4111-8111-111111111111'; // Fixed demo merchant ID (valid UUID v4)
  const DEMO_AUTH_USER_ID = 'demo-user-' + randomUUID().slice(0, 8);

  console.log('🌱 Starting database seed...');
  console.log(`Merchant ID: ${MERCHANT_ID}`);

  const adapter = new PrismaPg({
    connectionString: environment.DATABASE_URL,
    connectionTimeoutMillis: environment.DB_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: 10000,
    max: 5,
    statement_timeout: environment.DB_CONNECTION_TIMEOUT_MS,
    query_timeout: environment.DB_CONNECTION_TIMEOUT_MS,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Ensure merchant exists
    let merchant = await prisma.merchant.findUnique({ where: { id: MERCHANT_ID } });
    if (!merchant) {
      merchant = await prisma.merchant.create({
        data: {
          id: MERCHANT_ID,
          displayName: 'Demo Merchant Store',
          allowInvestigations: true,
          allowSubmissions: true,
          requireMerchantApproval: true,
        },
      });
      console.log('✅ Created merchant:', merchant.displayName);
    } else {
      console.log('✅ Merchant exists:', merchant.displayName);
    }

    // 2. Create/Update merchant member
    await prisma.merchantMember.upsert({
      where: {
        merchantId_authUserId: { merchantId: MERCHANT_ID, authUserId: DEMO_AUTH_USER_ID },
      },
      update: { role: 'ADMIN', active: true },
      create: { merchantId: MERCHANT_ID, authUserId: DEMO_AUTH_USER_ID, role: 'ADMIN', active: true },
    });
    console.log('✅ Created/updated merchant member');

    // 3. Create/Update merchant integration
    await prisma.merchantIntegration.upsert({
      where: { merchantId: MERCHANT_ID },
      update: {
        connectionStatus: 'CONNECTED',
        disputesReadStatus: 'READ_OK',
        credentialFingerprint: 'demo-credentials',
        lastCheckedAt: new Date(),
        paypalHttpStatus: 200,
        paypalDebugId: 'demo-debug-id',
      },
      create: {
        merchantId: MERCHANT_ID,
        connectionStatus: 'CONNECTED',
        disputesReadStatus: 'READ_OK',
        credentialFingerprint: 'demo-credentials',
        lastCheckedAt: new Date(),
        paypalHttpStatus: 200,
        paypalDebugId: 'demo-debug-id',
      },
    });
    console.log('✅ Created/updated merchant integration');

    // 4. Create Plans
    const plans = await Promise.all([
      prisma.plan.upsert({
        where: { id: 'plan-starter' },
        update: {},
        create: {
          id: 'plan-starter',
          name: 'Starter',
          priceCents: 2900,
          currency: 'USD',
          interval: 'MONTH',
          maxTransactions: 1000,
          maxDisputes: 50,
          includesConciliation: false,
          active: true,
        },
      }),
      prisma.plan.upsert({
        where: { id: 'plan-pro' },
        update: {},
        create: {
          id: 'plan-pro',
          name: 'Professional',
          priceCents: 9900,
          currency: 'USD',
          interval: 'MONTH',
          maxTransactions: 10000,
          maxDisputes: 500,
          includesConciliation: true,
          active: true,
        },
      }),
      prisma.plan.upsert({
        where: { id: 'plan-enterprise' },
        update: {},
        create: {
          id: 'plan-enterprise',
          name: 'Enterprise',
          priceCents: 29900,
          currency: 'USD',
          interval: 'MONTH',
          maxTransactions: null,
          maxDisputes: null,
          includesConciliation: true,
          active: true,
        },
      }),
    ]);
    console.log('✅ Created plans:', plans.map(p => p.name).join(', '));

    // 5. Create Subscription
    await prisma.subscription.upsert({
      where: { id: 'sub-demo' },
      update: {},
      create: {
        id: 'sub-demo',
        merchantId: MERCHANT_ID,
        planId: 'plan-pro',
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log('✅ Created subscription');

    // 6. Create sample transactions (last 30 days)
    const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'REFUNDED', 'COMPLETED'];
    const currencies = ['USD', 'USD', 'USD', 'EUR', 'GBP', 'USD'];
    const readinessStatuses = ['READY', 'INCOMPLETE', 'NEEDS_REVIEW', 'READY', 'READY', 'INCOMPLETE'];
    const sources = ['WEB', 'MOBILE', 'POS', 'WEB', 'WEB', 'API'];

    const transactionsData: any[] = [];

    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const capturedAt = new Date();
      capturedAt.setDate(capturedAt.getDate() - daysAgo);
      capturedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      const amount = (Math.random() * 500 + 10).toFixed(2);
      const currency = currencies[Math.floor(Math.random() * currencies.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const readiness = readinessStatuses[Math.floor(Math.random() * readinessStatuses.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];

      const tx = await prisma.transaction.create({
        data: {
          id: randomUUID(),
          merchantId: MERCHANT_ID,
          environment: 'sandbox',
          paypalCaptureId: `CAPTURE_${Date.now()}_${i}`,
          paypalOrderId: `ORDER_${Date.now()}_${i}`,
          merchantOrderReference: `ORD-${1000 + i}`,
          invoiceId: `INV-${2000 + i}`,
          status,
          currencyCode: currency,
          amount: amount,
          capturedAt,
          sourceEventId: randomUUID(),
          orderLinkError: null,
        },
      });
      transactionsData.push({ ...tx, readiness, source });
    }
    console.log(`✅ Created ${transactionsData.length} transactions`);

    // 7. Create sample merchant orders
    for (let i = 0; i < 30; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const orderedAt = new Date();
      orderedAt.setDate(orderedAt.getDate() - daysAgo);

      const items = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => ({
        sku: `SKU-${1000 + i}-${j}`,
        description: `Product ${100 + i}-${j}`,
        quantity: Math.floor(Math.random() * 3) + 1,
        unitAmount: (Math.random() * 100 + 10).toFixed(2),
      }));

      const totalAmount = items.reduce((sum, item) => sum + item.quantity * parseFloat(item.unitAmount), 0);

      await prisma.merchantOrder.create({
        data: {
          id: randomUUID(),
          merchantId: MERCHANT_ID,
          environment: 'sandbox',
          externalId: `EXT-ORD-${3000 + i}`,
          paypalOrderId: `ORDER_${Date.now()}_${i}`,
          sourceKind: 'DEMO',
          sourceSystem: 'Shopify',
          currencyCode: 'USD',
          totalAmount: totalAmount.toFixed(2),
          shippingAmount: '5.99',
          taxAmount: (totalAmount * 0.08).toFixed(2),
          discountAmount: '0.00',
          orderedAt,
          items,
          contentHash: `hash_${randomUUID()}`,
          createdBy: DEMO_AUTH_USER_ID,
        },
      });
    }
    console.log('✅ Created 30 merchant orders');

    // 8. Create sample disputes
    const disputeReasons = ['ITEM_NOT_RECEIVED', 'NOT_AS_DESCRIBED', 'UNAUTHORIZED', 'DUPLICATE', 'CREDIT_NOT_PROCESSED'];
    const internalStatuses = ['DETECTED', 'INVESTIGATING', 'VERIFYING', 'INCOMPLETE', 'REJECTED', 'APPROVED', 'READY_TO_SUBMIT', 'AWAITING_MERCHANT_APPROVAL', 'SUBMITTING', 'SUBMITTED', 'SUBMISSION_FAILED', 'AWAITING_PAYPAL', 'CLOSED', 'NEEDS_REVIEW'];

    const disputesData: any[] = [];

    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 60);
      const disputedAt = new Date();
      disputedAt.setDate(disputedAt.getDate() - daysAgo);

      const deadlineAt = new Date(disputedAt);
      deadlineAt.setDate(deadlineAt.getDate() + 10);

      const internalStatus = internalStatuses[Math.floor(Math.random() * internalStatuses.length)];
      const amount = (Math.random() * 300 + 20).toFixed(2);

      const dispute = await prisma.dispute.create({
        data: {
          id: randomUUID(),
          merchantId: MERCHANT_ID,
          environment: 'sandbox',
          paypalDisputeId: `PP-D-${10000 + i}`,
          paypalStatus: 'OPEN',
          paypalStage: 'DISPUTE',
          paypalReason: disputeReasons[Math.floor(Math.random() * disputeReasons.length)],
          reasonCategory: 'MERCHANDISE',
          internalStatus,
          currencyCode: 'USD',
          amount: amount,
          disputedAt,
          deadlineAt,
          lastEventAt: disputedAt,
          linkStatus: i < 10 ? 'LINKED' : 'UNLINKED',
          linkReason: i < 10 ? 'AUTO_MATCHED' : 'NO_MATCH',
          sourceEventId: randomUUID(),
        },
      });
      disputesData.push(dispute);
    }
    console.log(`✅ Created ${disputesData.length} disputes`);

    // 9. Create sample dispute events
    const eventTypes = ['DISPUTE_CREATED', 'EVIDENCE_REQUESTED', 'EVIDENCE_SUBMITTED', 'CASE_UPDATE', 'INTERNAL_REVIEW'];

    for (const dispute of disputesData) {
      const numEvents = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < numEvents; j++) {
        const eventDaysAgo = Math.floor(Math.random() * 10);
        const occurredAt = new Date(dispute.disputedAt);
        occurredAt.setDate(occurredAt.getDate() + eventDaysAgo);

        await prisma.disputeEvent.create({
          data: {
            id: randomUUID(),
            disputeId: dispute.id,
            eventId: randomUUID(),
            eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
            paypalEventId: `EVT_${Date.now()}_${j}`,
            outcome: 'APPLIED',
            occurredAt,
            receivedAt: occurredAt,
          },
        });
      }
    }
    console.log('✅ Created dispute events');

    // 10. Create sample submissions
    for (let i = 0; i < 8; i++) {
      const dispute = disputesData[Math.floor(Math.random() * disputesData.length)];
      const statuses = ['BLOCKED', 'SUBMITTED', 'SUBMITTED', 'FAILED', 'SUBMITTED'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      await prisma.submission.create({
        data: {
          id: randomUUID(),
          merchantId: MERCHANT_ID,
          disputeId: dispute.id,
          environment: 'sandbox',
          paypalRequestId: status === 'SUBMITTED' ? `REQ_${Date.now()}_${i}` : null,
          status,
          paypalResponseStatus: status === 'SUBMITTED' ? 200 : (status === 'FAILED' ? 400 : null),
          submittedAt: status === 'SUBMITTED' ? new Date() : null,
          errorCode: status === 'FAILED' ? 'INSUFFICIENT_EVIDENCE' : null,
          errorMessage: status === 'FAILED' ? 'Evidence does not meet PayPal requirements' : null,
          guardVerdict: status === 'SUBMITTED' ? 'APPROVED' : 'REJECTED',
          guardReasons: { completeness: true, validity: true },
          idempotencyKey: randomUUID(),
        },
      });
    }
    console.log('✅ Created 8 submissions');

    // 11. Create sample activity events (audit trail)
    const auditEventTypes = [
      'WEBHOOK_RECEIVED', 'TRANSACTION_CAPTURED', 'DISPUTE_DETECTED',
      'INVESTIGATION_STARTED', 'INVESTIGATION_COMPLETED', 'VERIFICATION_STARTED',
      'VERIFICATION_COMPLETED', 'EVIDENCE_REFRESHED', 'SUBMISSION_CREATED',
      'SUBMISSION_APPROVED', 'SUBMISSION_SUBMITTED', 'MERCHANT_SETTINGS_UPDATED'
    ];
    const actors = ['SYSTEM', 'WEBHOOK', 'AGENT_INVESTIGATOR', 'AGENT_VERIFIER', 'MERCHANT_USER'];
    const outcomes = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILURE'];

    for (let i = 0; i < 200; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - daysAgo);
      timestamp.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      const eventType = auditEventTypes[Math.floor(Math.random() * auditEventTypes.length)];
      const actor = actors[Math.floor(Math.random() * actors.length)];
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

      await prisma.auditEvent.create({
        data: {
          id: randomUUID(),
          merchantId: MERCHANT_ID,
          actorUserId: actor === 'MERCHANT_USER' ? DEMO_AUTH_USER_ID : null,
          actorKind: actor === 'MERCHANT_USER' ? 'USER' : 'SYSTEM',
          module: 'M03',
          action: eventType,
          outcome,
          transactionId: transactionsData.length > 0 ? transactionsData[Math.floor(Math.random() * transactionsData.length)].id : null,
          resourceType: eventType.includes('DISPUTE') ? 'DISPUTE' : 'TRANSACTION',
          resourceId: disputesData.length > 0 && eventType.includes('DISPUTE')
            ? disputesData[Math.floor(Math.random() * disputesData.length)].id
            : (transactionsData.length > 0 ? transactionsData[Math.floor(Math.random() * transactionsData.length)].id : null),
          durationMs: outcome === 'SUCCESS' ? Math.floor(Math.random() * 5000) + 100 : null,
          inputTokens: actor.includes('AGENT') ? Math.floor(Math.random() * 2000) + 500 : null,
          outputTokens: actor.includes('AGENT') ? Math.floor(Math.random() * 1000) + 200 : null,
          record: {
            eventType,
            actor,
            metadata: { source: 'demo-seed' },
          },
          createdAt: timestamp,
        },
      });
    }
    console.log('✅ Created 200 audit events');

    // 12. Create webhook events
    const webhookEventTypes = [
      'PAYMENT.CAPTURE.COMPLETED', 'CUSTOMER.DISPUTE.CREATED',
      'CUSTOMER.DISPUTE.RESOLVED', 'CHECKOUT.ORDER.APPROVED'
    ];

    for (let i = 0; i < 100; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const receivedAt = new Date();
      receivedAt.setDate(receivedAt.getDate() - daysAgo);
      receivedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      const eventType = webhookEventTypes[Math.floor(Math.random() * webhookEventTypes.length)];
      const tx = transactionsData.length > 0 ? transactionsData[Math.floor(Math.random() * transactionsData.length)] : null;

      await prisma.webhookEvent.create({
        data: {
          id: randomUUID(),
          merchantId: MERCHANT_ID,
          environment: 'sandbox',
          paypalEventId: `WH_${Date.now()}_${i}`,
          eventType,
          eventCreatedAt: new Date(receivedAt.getTime() - Math.floor(Math.random() * 60000)),
          webhookId: 'WH-DEMO-123',
          transmissionId: `TRANS_${Date.now()}_${i}`,
          payload: {
            event_type: eventType,
            resource: { id: tx?.paypalCaptureId || `CAP_${i}` },
          },
          rawBody: JSON.stringify({ event_type: eventType }),
          payloadHash: `hash_${randomUUID()}`,
          rawBodyHash: `hash_${randomUUID()}`,
          receivedAt,
        },
      });
    }
    console.log('✅ Created 100 webhook events');

    // 13. Create investigation runs (for disputes that were investigated)
    const investigatedDisputes = disputesData.filter(d =>
      ['INVESTIGATING', 'VERIFYING', 'APPROVED', 'READY_TO_SUBMIT'].includes(d.internalStatus)
    ).slice(0, 10);

    for (const dispute of investigatedDisputes) {
      await prisma.investigationRun.create({
        data: {
          id: randomUUID(),
          merchantId: MERCHANT_ID,
          transactionId: dispute.id, // using dispute id as placeholder
          idempotencyKey: randomUUID(),
          actorUserId: DEMO_AUTH_USER_ID,
          status: 'COMPLETED',
          provider: 'nvidia',
          model: 'nemotron-3-ultra',
          promptVersion: 'v1.2',
          evidenceRevision: 1,
          snapshot: { disputeId: dispute.id, amount: dispute.amount },
          snapshotHash: `hash_${randomUUID()}`,
          result: { readiness: 'READY', evidenceCollected: true },
          resultHash: `hash_${randomUUID()}`,
          trace: { steps: ['collect_evidence', 'analyze', 'verify'] },
          usage: { inputTokens: 1500, outputTokens: 800 },
          finishedAt: new Date(dispute.disputedAt.getTime() + 24 * 60 * 60 * 1000),
          createdAt: dispute.disputedAt,
          expiresAt: new Date(dispute.disputedAt.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
    console.log(`✅ Created ${investigatedDisputes.length} investigation runs`);

    // 14. Create verification runs
    for (let i = 0; i < 5; i++) {
      const investigation = await prisma.investigationRun.findFirst({ where: { merchantId: MERCHANT_ID } });
      if (!investigation) break;

      await prisma.verificationRun.create({
        data: {
          id: randomUUID(),
          merchantId: MERCHANT_ID,
          transactionId: investigation.transactionId,
          investigationId: investigation.id,
          idempotencyKey: randomUUID(),
          actorUserId: DEMO_AUTH_USER_ID,
          status: 'COMPLETED',
          provider: 'nvidia',
          model: 'nemotron-3-ultra',
          promptVersion: 'v1.1',
          evidenceRevision: 1,
          snapshot: { verified: true },
          snapshotHash: `hash_${randomUUID()}`,
          result: { approved: true, confidence: 'HIGH' },
          resultHash: `hash_${randomUUID()}`,
          trace: { verificationSteps: ['check_completeness', 'verify_accuracy', 'validate_format'] },
          usage: { inputTokens: 800, outputTokens: 400 },
          finishedAt: new Date(investigation.createdAt.getTime() + 12 * 60 * 60 * 1000),
          createdAt: investigation.createdAt,
          expiresAt: new Date(investigation.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
    console.log('✅ Created 5 verification runs');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - 1 Merchant: ${merchant.displayName}`);
    console.log(`   - 3 Plans (Starter, Pro, Enterprise)`);
    console.log(`   - 1 Active Subscription (Pro)`);
    console.log(`   - ${transactionsData.length} Transactions (last 30 days)`);
    console.log(`   - 30 Merchant Orders`);
    console.log(`   - ${disputesData.length} Disputes (various statuses)`);
    console.log(`   - 8 Submissions`);
    console.log(`   - 200 Audit Events (activity log)`);
    console.log(`   - 100 Webhook Events`);
    console.log(`   - Investigation & Verification runs`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});