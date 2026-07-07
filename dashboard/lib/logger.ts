import pino from 'pino';
import { config } from './config';

export function createLogger(serviceName: string) {
  const isBrowser = typeof window !== 'undefined';

  return pino({
    name: serviceName,
    level: config.NODE_ENV === 'test' ? 'silent' : 'info',
    browser: isBrowser ? { asObject: true } : undefined,
    transport:
      !isBrowser && config.NODE_ENV === 'development'
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
