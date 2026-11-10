import { Inject, Injectable, Logger, OnModuleInit, forwardRef } from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { IngestionQueueService } from '../event-ingestion/ingestion-queue.service.js';
import type { IngestionJobKind } from '@resolve-ai/contracts';
import { IntegrationsService } from '../integrations/integrations.service.js';

@Injectable()
export class JobsProcessor implements OnModuleInit {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(
    private readonly ingestionQueue: IngestionQueueService,
    @Inject(forwardRef(() => IntegrationsService))
    private readonly integrations: IntegrationsService,
  ) {}

  onModuleInit() {
    // Handlers are registered explicitly via registerHandlers() from JobsModule.
  }

  /**
   * Registers all job handlers with the given JobsService.
   * Called by JobsModule.onModuleInit before pg-boss connects.
   */
  registerHandlers(jobs: JobsService) {
    jobs.registerHandler(
      'TRANSACTION_CAPTURED',
      async (data) => this.processTransactionCaptured(data),
    );
    jobs.registerHandler(
      'DISPUTE_CHANGED',
      async (data) => this.processDisputeChanged(data),
    );
    jobs.registerHandler(
      'ERP_SYNC',
      async (data) => this.processErpSync(data),
    );
    this.logger.log('Registered pg-boss job handlers: TRANSACTION_CAPTURED, DISPUTE_CHANGED, ERP_SYNC');
  }

  /**
   * Processes a transaction capture ingestion job via the existing M02 queue.
   */
  async processTransactionCaptured(data: unknown): Promise<void> {
    const payload = data as { eventId: string; merchantId: string };
    this.logger.log(`Processing TRANSACTION_CAPTURED for event ${payload.eventId}`);
    const result = await this.ingestionQueue.processNext(
      'TRANSACTION_CAPTURED' as IngestionJobKind,
      payload.merchantId,
      async () => ({ transactionId: undefined }),
    );
    if (result === 'EMPTY') {
      this.logger.debug(`No queued TRANSACTION_CAPTURED job for merchant ${payload.merchantId}`);
    }
  }

  /**
   * Processes a dispute changed ingestion job via the existing M02 queue.
   */
  async processDisputeChanged(data: unknown): Promise<void> {
    const payload = data as { eventId: string; merchantId: string };
    this.logger.log(`Processing DISPUTE_CHANGED for event ${payload.eventId}`);
    const result = await this.ingestionQueue.processNext(
      'DISPUTE_CHANGED' as IngestionJobKind,
      payload.merchantId,
      async () => ({ transactionId: undefined }),
    );
    if (result === 'EMPTY') {
      this.logger.debug(`No queued DISPUTE_CHANGED job for merchant ${payload.merchantId}`);
    }
  }

  /**
   * Processes an ERP sync job enqueued in pg-boss.
   */
  async processErpSync(data: unknown): Promise<void> {
    const payload = data as {
      connectionId: string;
      merchantId: string;
      provider: string;
      resource: string;
      cursor: string | null;
    };
    this.logger.log(
      `Processing ERP_SYNC for ${payload.provider}/${payload.resource} connection ${payload.connectionId}`,
    );
    await this.integrations.processErpSync(payload);
  }
}
