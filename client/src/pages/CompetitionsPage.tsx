import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { LeagueTable } from "@/components/LeagueTable";
import { KnockoutBracket } from "@/components/KnockoutBracket";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import type { Competition } from "@shared/schema";

export function CompetitionsPage() {
  const { gameState, loading } = useFutsalManager();

  // Fetch competitions with caching
  const { data: competitions = [], isLoading: loadingCompetitions } = useQuery<Competition[]>({
    queryKey: ["competitions", gameState?.playerTeamId],
    queryFn: async () => {
      const response = await fetch("/api/competitions");
      if (!response.ok) throw new Error("Failed to fetch competitions");
      return response.json();
    },
    enabled: !!gameState,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Memoize filtered competitions to avoid recalculating on every render
  const leagueCompetitions = useMemo(() => {
    return competitions.filter(c => c.type === "league");
  }, [competitions]);

  const knockoutCompetitions = useMemo(() => {
    return competitions.filter(c => c.type === "cup" || c.type === "continental" || c.type === "super_cup");
  }, [competitions]);

  if (loading || loadingCompetitions || !gameState) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading competitions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Competitions</h1>
        <p className="text-muted-foreground">
          View league tables and knockout tournament brackets
        </p>
      </div>

      {competitions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No competitions available</p>
              <p className="text-sm mt-2">Competitions will be generated at the start of the season</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* League Competitions */}
          {leagueCompetitions.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-primary">League Competitions</h2>
              {leagueCompetitions.map((competition) => (
                <LeagueTable
                  key={competition.id}
                  competitionName={competition.name}
                  standings={competition.standings}
                  playerTeamId={gameState.playerTeamId}
                  currentMatchday={competition.currentMatchday}
                  totalMatchdays={competition.totalMatchdays}
                />
              ))}
            </div>
          )}

          {/* Knockout Competitions */}
          {knockoutCompetitions.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-primary mt-8">Knockout Competitions</h2>
              {knockoutCompetitions.map((competition) => (
                <KnockoutBracket
                  key={competition.id}
                  competitionName={competition.name}
                  matches={competition.fixtures}
                  playerTeamId={gameState.playerTeamId}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
