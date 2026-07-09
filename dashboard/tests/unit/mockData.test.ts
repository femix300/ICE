import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMockFallback } from '../../lib/mockData';

describe('useMockFallback', () => {
  it('returns real data on successful fetch', async () => {
    const mockFetcher = vi.fn().mockResolvedValue([{ id: 1, name: 'real' }]);
    const { result } = renderHook(() => useMockFallback(mockFetcher, [{ id: 0, name: 'mock' }]));
    
    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 1, name: 'real' }]);
      expect(result.current.isMock).toBe(false);
    });
  });

  it('falls back to mock data on fetch failure', async () => {
    const mockFetcher = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useMockFallback(mockFetcher, [{ id: 0, name: 'mock' }]));
    
    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 0, name: 'mock' }]);
      expect(result.current.isMock).toBe(true);
    });
  });

  it('falls back to mock data if response is empty array', async () => {
    const mockFetcher = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useMockFallback(mockFetcher, [{ id: 0, name: 'mock' }]));
    
    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 0, name: 'mock' }]);
      expect(result.current.isMock).toBe(true);
    });
  });
});
