import { Router } from 'express';

export const v1Router = Router();

export function setupV1Router(deps: { merchantsRouter?: Router; vendorsRouter?: Router; authMiddleware?: any }) {
  if (deps.merchantsRouter) v1Router.use('/merchants', deps.merchantsRouter);
  if (deps.vendorsRouter) v1Router.use('/vendors', deps.vendorsRouter);
  
  if (deps.authMiddleware) {
    const authRouter = Router();
    authRouter.get('/me', deps.authMiddleware, (req, res) => {
      res.json({ merchant: (req as any).principal });
    });
    v1Router.use('/auth', authRouter);
  }
}
