import pino from 'pino';

export function createLogger(serviceName: string) {
  return pino({
    name: serviceName,
    level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    } : undefined,
  });
}
