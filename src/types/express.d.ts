declare global {
  namespace Express {
    interface Request {
      principal?: {
        tier: 'merchant' | 'vendor';
        id: string;
        merchantId?: string;
      };
    }
  }
}

export {};
