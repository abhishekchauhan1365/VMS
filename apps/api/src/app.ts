import './config/env.js';

import { randomUUID } from 'node:crypto';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/** The Express app, with no listening socket attached — importable by tests via Supertest. */
export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.WEB_URL, credentials: true }));
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = req.headers['x-request-id']?.toString() ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
    }),
  );
  app.use(cookieParser());
  app.use(express.json());

  app.use('/api/v1', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
