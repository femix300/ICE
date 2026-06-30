import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

describe('GET /healthz', () => {
  let app: any;

  beforeAll(async () => {
    process.env.CORS_ORIGIN = 'http://localhost';
    const mod = await import('../../src/app.js');
    app = mod.app;
  });

  it('returns { ok: true } with status 200', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
