import { app, nomba } from './app.js';
import { config } from './config.js';
import { createLogger } from './lib/logger.js';

const log = createLogger('server');

const port = config.PORT;

try {
  await nomba.authenticate();
  log.info('Nomba client authenticated successfully');
} catch (err) {
  log.error({ err }, 'Failed to authenticate with Nomba on startup - exiting');
  process.exit(1);
}

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
