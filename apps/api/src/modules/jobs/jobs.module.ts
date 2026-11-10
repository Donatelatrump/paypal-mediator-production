import { Module, OnModuleDestroy, OnModuleInit, forwardRef } from '@nestjs/common';
import { ENVIRONMENT } from '../../common/config/environment.js';
import { AuditModule } from '../monitoring/audit.module.js';
import { JobsProcessor } from './jobs.processor.js';
import { JobsService } from './jobs.service.js';
import { IntegrationsModule } from '../integrations/index.js';

@Module({
  imports: [AuditModule, forwardRef(() => IntegrationsModule)],
  providers: [JobsService, JobsProcessor],
  exports: [JobsService],
})
export class JobsModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly jobs: JobsService,
    private readonly processor: JobsProcessor,
  ) {}

  async onModuleInit() {
    // Register handlers before connecting so subscriptions are active on start.
    this.processor.registerHandlers(this.jobs);
    await this.jobs.connect();
  }

  async onModuleDestroy() {
    await this.jobs.disconnect();
  }
}
