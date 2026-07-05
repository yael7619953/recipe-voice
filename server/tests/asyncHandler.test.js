import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from '../utils/asyncHandler.js';

describe('asyncHandler', () => {
  it('invokes the wrapped handler with req/res/next', async () => {
    const handler = vi.fn(async (_req, res) => res.json({ ok: true }));
    const res = { json: vi.fn() };
    const next = vi.fn();

    await asyncHandler(handler)({}, res, next);

    expect(handler).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards a rejected promise to next()', async () => {
    const error = new Error('boom');
    const next = vi.fn();

    await asyncHandler(async () => {
      throw error;
    })({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
