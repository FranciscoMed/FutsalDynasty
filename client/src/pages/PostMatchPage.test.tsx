import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PostMatchPage from "./PostMatchPage";

vi.mock("wouter", () => ({
  useParams: () => ({ matchId: "42" }),
  useLocation: () => ["/match/42/post-match", vi.fn()],
}));

const persistedReview = {
  match: {
    id: 42,
    homeTeamName: "Futsal United",
    awayTeamName: "City Warriors",
    homeScore: 2,
    awayScore: 1,
    competitionName: "Premier Division",
    date: "2024-08-08T12:00:00.000Z",
    isHome: true,
    events: [
      {
        minute: 8,
        type: "goal",
        playerId: 7,
        playerName: "Alex Silva",
        teamId: 1,
        description: "Saved goal by Alex Silva",
      },
    ],
    homeStats: {
      possession: 63,
      shots: 12,
      shotsOnTarget: 7,
      passes: 98,
      passAccuracy: 84,
      tackles: 9,
      interceptions: 4,
      blocks: 2,
      dribblesSuccessful: 6,
      dribblesUnsuccessful: 3,
      fouls: 5,
      corners: 4,
      saves: 3,
    },
    awayStats: {
      possession: 37,
      shots: 8,
      shotsOnTarget: 3,
      passes: 74,
      passAccuracy: 71,
      tackles: 11,
      interceptions: 5,
      blocks: 1,
      dribblesSuccessful: 3,
      dribblesUnsuccessful: 5,
      fouls: 7,
      corners: 2,
      saves: 5,
    },
  },
  standings: [],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PostMatchPage />
    </QueryClientProvider>,
  );
}

describe("post-match review", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => persistedReview,
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads persisted score, events, and statistics again after a page reload", async () => {
    const fetchMock = vi.mocked(fetch);
    const firstPage = renderPage();

    expect(await screen.findByText("Saved goal by Alex Silva")).toBeInTheDocument();
    expect(screen.getByText("Match Statistics")).toBeInTheDocument();
    expect(screen.getByText("63%")).toBeInTheDocument();
    expect(screen.getByText("Premier Division")).toBeInTheDocument();
    firstPage.unmount();

    renderPage();

    expect(await screen.findByText("Saved goal by Alex Silva")).toBeInTheDocument();
    expect(screen.getAllByText("Futsal United").length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/matches/42/post-match");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/matches/42/post-match");
  });

  it("shows an explicit error when the persisted review is unavailable", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    renderPage();

    expect(await screen.findByText(/Failed to load post-match data/i)).toBeInTheDocument();
    expect(screen.queryByText("Match Result")).not.toBeInTheDocument();
  });
});
