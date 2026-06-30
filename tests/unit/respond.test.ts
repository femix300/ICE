import { describe, it, expect, vi } from 'vitest';
import type { Response } from 'express';
import { ok, created, noContent } from '../../src/lib/respond.js';

describe('Respond Helpers', () => {
  it('ok() helper returns correct JSON shape with requestId', () => {
    const mockJson = vi.fn();
    const mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    const res = {
      status: mockStatus,
      locals: { requestId: 'test-req-id' },
    } as unknown as Response;

    ok(res, { foo: 'bar' });

    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith({
      ok: true,
      data: { foo: 'bar' },
      requestId: 'test-req-id',
    });
  });

  it('created() sets status 201', () => {
    const mockJson = vi.fn();
    const mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    const res = {
      status: mockStatus,
      locals: { requestId: 'test-req-id' },
    } as unknown as Response;

    created(res, { id: 1 });

    expect(mockStatus).toHaveBeenCalledWith(201);
  });

  it('noContent() sets status 204 and sends nothing', () => {
    const mockSend = vi.fn();
    const mockStatus = vi.fn().mockReturnValue({ send: mockSend });
    const res = {
      status: mockStatus,
      locals: {},
    } as unknown as Response;

    noContent(res);

    expect(mockStatus).toHaveBeenCalledWith(204);
    expect(mockSend).toHaveBeenCalled();
  });
});
