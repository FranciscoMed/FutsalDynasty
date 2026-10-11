import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PostMatchPage from '../PostMatchPage';

vi.mock('wouter', () => ({
  useParams: () => ({ matchId: '7' }),
  useLocation: () => ['/match/7/post-match', vi.fn()],
}));

const payload = {
  match: {
    id: 7, homeTeamName: 'Home FC', awayTeamName: 'Away FC', homeScore: 2, awayScore: 1,
    competitionName: 'League', date: '2025-01-01', isHome: true, homeTeamId: 1, awayTeamId: 2,
  },
  events: [
    { minute: 12, type: 'goal', playerName: 'Ana Silva', teamId: 1, description: 'Ana scores' },
  ],
  homeStats: { possession: 55, shots: 10, shotsOnTarget: 5 },
  awayStats: { possession: 45, shots: 4, shotsOnTarget: 2 },
  standings: [],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PostMatchPage />
    </QueryClientProvider>
  );
}

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('PostMatchPage', () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it('shows result, events and statistics from persisted data, again after reload', async () => {
    const fetchFn = mockFetch(200, payload);
    const first = renderPage();
    expect(await screen.findByText('VICTORY')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /events/i }));
    expect(await screen.findByText('Ana scores')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /statistics/i }));
    expect(await screen.findByTestId('match-statistics')).toBeInTheDocument();
    first.unmount();

    renderPage();
    expect(await screen.findByText('VICTORY')).toBeInTheDocument();
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn).toHaveBeenCalledWith('/api/matches/7/post-match');
  });

  it('flags missing events and statistics instead of an empty review', async () => {
    mockFetch(200, { ...payload, events: [], homeStats: null, awayStats: null });
    renderPage();
    await screen.findByText('VICTORY');
    await userEvent.click(screen.getByRole('tab', { name: /events/i }));
    expect(await screen.findByText(/events are unavailable/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /statistics/i }));
    expect(await screen.findByText(/statistics are unavailable/i)).toBeInTheDocument();
  });

  it('surfaces an error when the match was not played', async () => {
    mockFetch(409, { error: 'Match has not been played yet' });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Match has not been played yet/)).toBeInTheDocument()
    );
    expect(screen.queryByText('VICTORY')).not.toBeInTheDocument();
  });
});
