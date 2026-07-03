import { app } from './app.js';
import { config } from './config.js';
import { createLogger } from './lib/logger.js';

const log = createLogger('server');

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
