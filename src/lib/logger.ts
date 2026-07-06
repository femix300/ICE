import pino from 'pino';

import { config } from '../config.js';

export function createLogger(serviceName: string) {
  return pino({
    name: serviceName,
    level: config.NODE_ENV === 'test' ? 'silent' : 'info',
    transport:
      config.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
            },
          }
        : undefined,
  });
}
