import { Router, type RequestHandler, type Request } from 'express';

export const v1Router = Router();

export function setupV1Router(deps: { merchantsRouter?: Router; vendorsRouter?: Router; authMiddleware?: RequestHandler }) {
  if (deps.merchantsRouter) v1Router.use('/merchants', deps.merchantsRouter);
  if (deps.vendorsRouter) v1Router.use('/vendors', deps.vendorsRouter);
  
  if (deps.authMiddleware) {
    const authRouter = Router();
    authRouter.get('/me', deps.authMiddleware, (req: Request, res) => {
      // Cast req to an intersection type to safely access the principal property without using 'any'
      res.json({ merchant: (req as Request & { principal?: unknown }).principal });
    });
    v1Router.use('/auth', authRouter);
  }
}
