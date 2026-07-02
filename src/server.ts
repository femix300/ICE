import { config } from './config.js';
import { app } from './app.js';
import { createLogger } from './lib/logger.js';

const log = createLogger('server');

app.listen(config.PORT, () => {
  log.info({ port: config.PORT }, 'ICE server started');
});
