import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';

import { config } from './config.js';
import { v1Router } from './routes/v1.js';
import { notFoundHandler, errorHandler } from './middleware/errors.js';

const app = express();

// Assign a request ID for tracing
app.use((req, res, next) => {
  res.locals.requestId = crypto.randomUUID();
  next();
});

// Middleware order is fixed per engineering guidelines
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// Health Check
app.get('/healthz', (req, res) => res.json({ ok: true }));

// API Routes
app.use('/v1', v1Router);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
