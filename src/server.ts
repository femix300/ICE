import { app } from './app.js';
import { config } from './config.js';
import { createLogger } from './lib/logger.js';

const log = createLogger('server');

const port = parseInt(config.PORT, 10);

const server = app.listen(port, '127.0.0.1', () => {
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
