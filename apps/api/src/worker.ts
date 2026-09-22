import { env } from './config/env.js';

import { Worker } from 'bullmq';
import { redis } from './lib/redis.js';
import { logger } from './lib/logger.js';
import { processVisitJob } from './jobs/handlers.js';

const worker = new Worker('visits', processVisitJob, {
  connection: redis,
  concurrency: 5,
});

worker.on('completed', (job) => {
  logger.debug({ jobId: job.id, name: job.name }, 'Job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, name: job?.name, err }, 'Job failed');
});

logger.info(`Worker started (env=${env.NODE_ENV}), listening on queue "visits"`);
