import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure the DOM is wiped clean after every single test
afterEach(() => {
  cleanup();
});
