import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { LeagueTable } from "@/components/LeagueTable";
import { KnockoutBracket } from "@/components/KnockoutBracket";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Trophy } from "lucide-react";
import type { Competition } from "@shared/schema";

export function CompetitionsPage() {
  const { gameState, loading } = useFutsalManager();
  const [showAllCompetitions, setShowAllCompetitions] = useState(false);

  // Fetch competitions with caching
  const { data: competitions = [], isLoading: loadingCompetitions } = useQuery<Competition[]>({
    queryKey: ["competitions", showAllCompetitions],
    queryFn: async () => {
      const url = showAllCompetitions 
        ? "/api/competitions?showAll=true" 
        : "/api/competitions";
      const response = await fetch(url);
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
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground">
            View league tables and knockout tournament brackets
          </p>
          <div className="flex items-center gap-2 ml-4 px-3 py-1.5 rounded-md bg-muted/50 border border-border">
            <Trophy className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {showAllCompetitions ? "All Competitions" : "My Club Only"}
            </span>
            <Switch
              checked={showAllCompetitions}
              onCheckedChange={setShowAllCompetitions}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
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
                  competitionId={competition.id}
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
