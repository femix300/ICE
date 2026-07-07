import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests share one live Postgres DB with no per-test
    // isolation (they DELETE FROM customers/vendors in beforeEach/afterEach).
    // Running test files in parallel workers lets one file's cleanup wipe
    // rows another file is mid-flow on, causing spurious 404s/401s.
    // Disabling file parallelism serializes test files so this can't happen.
    fileParallelism: false,
  },
});
