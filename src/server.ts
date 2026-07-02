import { app } from './app.js';
import { config } from './config.js';
import { createLogger } from './lib/logger.js';
import pg from 'pg';
const { Pool } = pg;
import { createMerchantsRepo } from './repositories/merchants.repo.js';
import { createMerchantsService } from './services/merchants.service.js';
import { createMerchantsController } from './controllers/merchants.controller.js';
import { createMerchantsRouter } from './routes/merchants.routes.js';
import { createVendorsRepo } from './repositories/vendors.repo.js';
import { createVendorsService } from './services/vendors.service.js';
import { createVendorsController } from './controllers/vendors.controller.js';
import { createVendorsRouter } from './routes/vendors.routes.js';
import { setupV1Router } from './routes/v1.js';
import { createNombaClient } from './lib/nomba.js';
import { createAuthMiddleware } from './middleware/auth.js';

const log = createLogger('server');

const db = new Pool({
  connectionString: config.DATABASE_URL,
});

const nomba = createNombaClient();

const merchantsRepo = createMerchantsRepo(db);
const vendorsRepo = createVendorsRepo(db);

const merchantsService = createMerchantsService({ merchants: merchantsRepo });
const vendorsService = createVendorsService({ vendors: vendorsRepo, nomba });

const merchantsController = createMerchantsController(merchantsService);
const vendorsController = createVendorsController(vendorsService);

const authMiddleware = createAuthMiddleware({ merchants: merchantsRepo, vendors: vendorsRepo });

const merchantsRouter = createMerchantsRouter(merchantsController, authMiddleware);
const vendorsRouter = createVendorsRouter(vendorsController, authMiddleware);

setupV1Router({ merchantsRouter, vendorsRouter });

const port = config.PORT;

const server = app.listen(port, '0.0.0.0', () => {
  log.info({ port }, 'Server listening');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('SIGTERM received. Shutting down gracefully.');
  server.close(() => {
    log.info('HTTP server closed.');
    process.exit(0);
  });
});
