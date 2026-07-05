import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';

describe('API health endpoint', () => {
  let app;

  beforeAll(async () => {
    // The Google OAuth strategy is constructed at import time and requires
    // credentials, so provide harmless placeholders for the test run.
    process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret';

    const { default: routes } = await import('../routes/index.js');
    app = express();
    app.use(express.json());
    app.use('/api', routes);
  });

  it('GET /api/health responds with a healthy payload', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'API is healthy' });
  });
});
