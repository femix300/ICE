import { Router } from 'express';

// We will export a factory function or initialize with null for now
// Since this depends on app.ts wiring, we can accept the router from app.ts
// or create a setup router function.
export const v1Router = Router();

export function setupV1Router(deps: { merchantsRouter?: Router; vendorsRouter?: Router }) {
  if (deps.merchantsRouter) v1Router.use('/merchants', deps.merchantsRouter);
  if (deps.vendorsRouter) v1Router.use('/vendors', deps.vendorsRouter);
}
