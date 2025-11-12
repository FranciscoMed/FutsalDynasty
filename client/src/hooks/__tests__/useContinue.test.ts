import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useContinue } from '../useContinue';
import type { ReactNode } from 'react';

// Mock the useFutsalManager hook
vi.mock('@/lib/stores/useFutsalManager', () => ({
  useFutsalManager: vi.fn(() => ({
    gameState: {
      id: 1,
      currentDate: '2024-09-12T00:00:00.000Z',
      season: 1,
      playerTeamId: 1,
    },
  })),
}));

// Mock the useMatchDay hook
vi.mock('../useMatchDay', () => ({
  useMatchDay: vi.fn(() => ({
    nextMatch: null,
    hasMatchToday: false,
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe('useContinue', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Button label generation', () => {
    it('should show "Continue to Match (6 days)" for match event', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'match',
          date: '2024-09-18T20:00:00.000Z',
          daysUntil: 6,
          description: 'Match: Team A vs Team B',
          priority: 1,
          details: {
            matchId: 1,
            homeTeamId: 1,
            awayTeamId: 2,
          },
        }),
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.buttonLabel).toBe('Continue to Match (6 days)');
    });

    it('should show "Continue to Match (1 day)" for match tomorrow', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'match',
          date: '2024-09-13T20:00:00.000Z',
          daysUntil: 1,
          description: 'Match: Team A vs Team B',
          priority: 1,
          details: {
            matchId: 1,
          },
        }),
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.buttonLabel).toBe('Continue to Match (1 day)');
    });

    it('should show "Continue to Training (3 days)" for training event', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'training_completion',
          date: '2024-09-15T00:00:00.000Z',
          daysUntil: 3,
          description: 'Training completion',
          priority: 2,
          details: {},
        }),
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.buttonLabel).toBe('Continue to Training (3 days)');
    });

    it('should show "Continue to Month End (5 days)" for month end', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'month_end',
          date: '2024-10-01T00:00:00.000Z',
          daysUntil: 5,
          description: 'End of month - Financial report',
          priority: 4,
          details: {
            month: 10,
            year: 2024,
          },
        }),
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.buttonLabel).toBe('Continue to Month End (5 days)');
    });

    it('should show "Continue to Season End (90 days)" for season end', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'season_end',
          date: '2024-06-30T00:00:00.000Z',
          daysUntil: 90,
          description: 'End of season',
          priority: 5,
          details: {
            season: 1,
          },
        }),
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.buttonLabel).toBe('Continue to Season End (90 days)');
    });

    it('should show "Continue" when no event data is available', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.buttonLabel).toBe('Continue');
    });
  });

  describe('Advancement speed calculation', () => {
    it('should use 100ms per day for short periods (1-7 days)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'match',
          daysUntil: 5,
          priority: 1,
        }),
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.advancementSpeed).toBe(100);
    });

    it('should use 50ms per day for medium periods (8-30 days)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'match',
          daysUntil: 15,
          priority: 1,
        }),
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.advancementSpeed).toBe(50);
    });

    it('should use 20ms per day for long periods (31+ days)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'season_end',
          daysUntil: 40,
          priority: 5,
        }),
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.advancementSpeed).toBe(20);
    });

    it('should cap at 3 seconds maximum (e.g., 150 days)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'season_end',
          daysUntil: 150,
          priority: 5,
        }),
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 150 days at 20ms would be 3000ms, but should cap at 3000ms
      // So ms per day = 3000 / 150 = 20ms
      expect(result.current.advancementSpeed).toBe(20);
    });

    it('should have minimum 10ms per day for very long periods', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'season_end',
          daysUntil: 500,
          priority: 5,
        }),
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 500 days would require 3000 / 500 = 6ms per day
      // But minimum is 10ms
      expect(result.current.advancementSpeed).toBe(10);
    });
  });

  describe('Match blocking detection', () => {
    it('should detect unplayed match today', async () => {
      const { useMatchDay } = await import('../useMatchDay');
      vi.mocked(useMatchDay).mockReturnValue({
        nextMatch: {
          id: 1,
          date: '2024-09-12T20:00:00.000Z',
          played: false,
          preparationStatus: 'pending',
          homeTeamName: 'Team A',
          awayTeamName: 'Team B',
        } as any,
        hasMatchToday: true,
        loading: false,
        refetch: vi.fn(),
      });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'match',
          daysUntil: 0,
          priority: 1,
          details: { matchId: 1 },
        }),
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasUnplayedMatchToday).toBe(true);
      expect(result.current.unplayedMatchId).toBe(1);
    });

    it('should not block when no match today', async () => {
      const { useMatchDay } = await import('../useMatchDay');
      vi.mocked(useMatchDay).mockReturnValue({
        nextMatch: null,
        hasMatchToday: false,
        loading: false,
        refetch: vi.fn(),
      });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          type: 'match',
          daysUntil: 5,
          priority: 1,
        }),
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasUnplayedMatchToday).toBe(false);
      expect(result.current.unplayedMatchId).toBe(null);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.buttonLabel).toBe('Continue');
    });

    it('should handle 404 responses', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const { result } = renderHook(() => useContinue(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.buttonLabel).toBe('Continue');
    });
  });
});
