import { app, nomba } from './app.js';
import { config } from './config.js';
import { createLogger } from './lib/logger.js';

const log = createLogger('server');

const port = config.PORT;

try {
  await nomba.authenticate();
  log.info('Nomba client authenticated successfully');
} catch (err) {
  log.warn({ err }, 'Failed to authenticate with Nomba on startup - running in degraded mode for portfolio docs');
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
