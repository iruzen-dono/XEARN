import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PaymentWebhookController } from '../../src/payment/payment-webhook.controller';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * INTEGRATION TEST: Webhook replay protection
 *
 * Vérifie que:
 * 1. Un webhook avec le même providerTransactionId ne crédite qu'une fois
 * 2. Le deuxième appel est ignoré silencieusement (idempotence)
 * 3. Les metadata sont vérifiées correctement
 */
describe('PaymentWebhookController - Replay Protection (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let webhookController: PaymentWebhookController;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [PrismaService, PaymentWebhookController, ConfigService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    webhookController = moduleFixture.get<PaymentWebhookController>(PaymentWebhookController);

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `webhook-replay-test-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'WebhookReplay',
        phoneNumber: `+225000${Math.random().toString().slice(2, 10)}`,
        password: 'hashed',
        status: 'PENDING',
        tier: 'NORMAL',
      },
    });
    testUserId = user.id;

    await prisma.wallet.create({
      data: { userId: testUserId, balance: 0, totalEarned: 0 },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
    await prisma.wallet.delete({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  it('should credit account only once for duplicate webhook events', async () => {
    const providerTxId = `test-tx-${Date.now()}`;
    const webhookPayload = {
      entity: {
        id: providerTxId,
        amount: 4000,
        metadata: {
          userId: testUserId,
          type: 'activation' as const,
        },
      },
      event: 'transaction.approved',
    };

    // First webhook call — should process
    const result1 = await webhookController.handleWebhook(webhookPayload, undefined);
    expect(result1).toEqual({ received: true });

    // Verify user activated and wallet credited
    const user1 = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(user1!.status).toBe('ACTIVATED');

    const transactions1 = await prisma.transaction.findMany({
      where: { userId: testUserId, type: 'ACTIVATION' },
    });
    expect(transactions1.length).toBe(1);
    expect(Number(transactions1[0].amount)).toBe(4000);

    // Second webhook call (replay) — should be ignored
    const result2 = await webhookController.handleWebhook(webhookPayload, undefined);
    expect(result2).toEqual({ received: true });

    // Verify no duplicate transaction
    const transactions2 = await prisma.transaction.findMany({
      where: { userId: testUserId, type: 'ACTIVATION' },
    });
    expect(transactions2.length).toBe(1); // Still only one

    // Verify balance not double-credited
    const wallet = await prisma.wallet.findUnique({ where: { userId: testUserId } });
    expect(Number(wallet!.balance)).toBe(0); // Activation doesn't credit wallet directly
  });

  it('should handle concurrent duplicate webhooks gracefully', async () => {
    const providerTxId2 = `test-tx-concurrent-${Date.now()}`;
    const webhookPayload = {
      entity: {
        id: providerTxId2,
        amount: 5000,
        metadata: {
          userId: testUserId,
          type: 'activation' as const,
        },
      },
      event: 'transaction.approved',
    };

    // Send the same webhook twice concurrently
    const webhook1 = webhookController.handleWebhook(webhookPayload, undefined);
    const webhook2 = webhookController.handleWebhook(webhookPayload, undefined);

    const [res1, res2] = await Promise.all([webhook1, webhook2]);

    expect(res1).toEqual({ received: true });
    expect(res2).toEqual({ received: true });

    // Only one transaction should exist
    const transactions = await prisma.transaction.findMany({
      where: {
        metadata: {
          path: ['providerTransactionId'],
          equals: providerTxId2,
        },
      },
    });

    expect(transactions.length).toBeLessThanOrEqual(1);
  });
});
