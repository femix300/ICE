import { describe, it, expect, vi } from 'vitest';

vi.mock('dotenv', () => ({
  default: { config: vi.fn() }
}));

describe('Config Validation', () => {
  it('Missing required env var causes process to exit on startup', async () => {
    // We isolate the module to test side-effects
    const originalEnv = process.env;
    const mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: any) => {
      throw new Error(`Process exited with code ${code}`);
    });
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Clear env to force validation failure
    process.env = {};

    try {
      // Re-importing config dynamically to trigger top-level validation
      await expect(import('../../src/config.js?mock=' + Date.now())).rejects.toThrow(
        'Process exited with code 1'
      );
    } finally {
      process.env = originalEnv;
      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    }
  });
});
