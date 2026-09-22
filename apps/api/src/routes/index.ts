import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { visitorsRouter } from './visitors.routes.js';
import { visitsRouter } from './visits.routes.js';
import { invitesRouter } from './invites.routes.js';
import { passesRouter } from './passes.routes.js';
import { hostsRouter } from './hosts.routes.js';
import { adminRouter } from './admin.routes.js';
import { officesRouter } from './offices.routes.js';

export const apiRouter: Router = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok' }));
apiRouter.use('/auth', authRouter);
apiRouter.use('/visitors', visitorsRouter);
apiRouter.use('/visits', visitsRouter);
apiRouter.use('/invites', invitesRouter);
apiRouter.use('/passes', passesRouter);
apiRouter.use('/hosts', hostsRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/offices', officesRouter);
