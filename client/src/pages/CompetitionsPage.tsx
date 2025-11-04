import { useEffect, useState } from "react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { LeagueTable } from "@/components/LeagueTable";
import { KnockoutBracket } from "@/components/KnockoutBracket";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import type { Competition } from "@shared/schema";

export function CompetitionsPage() {
  const { gameState, loading } = useFutsalManager();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);

  useEffect(() => {
    if (gameState) {
      loadCompetitions();
    }
  }, [gameState]);

  const loadCompetitions = async () => {
    setLoadingCompetitions(true);
    try {
      const response = await fetch("/api/competitions");
      if (response.ok && gameState) {
        const data = await response.json();
        
        // Client-side validation: filter fixtures and standings to player's team only
        const validatedCompetitions = data.map((comp: Competition) => ({
          ...comp,
          fixtures: comp.fixtures.filter(fixture =>
            fixture.homeTeamId === gameState.playerTeamId || 
            fixture.awayTeamId === gameState.playerTeamId
          ),
          standings: comp.standings // Standings are already filtered by server, but team must be in competition
        })).filter((comp: Competition) => comp.teams.includes(gameState.playerTeamId));
        
        setCompetitions(validatedCompetitions);
      }
    } catch (error) {
      console.error("Failed to load competitions:", error);
    } finally {
      setLoadingCompetitions(false);
    }
  };

  if (loading || loadingCompetitions || !gameState) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading competitions...</p>
      </div>
    );
  }

  const leagueCompetitions = competitions.filter(c => c.type === "league");
  const knockoutCompetitions = competitions.filter(c => c.type === "cup" || c.type === "continental" || c.type === "super_cup");

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
              <h2 className="text-2xl font-bold text-[#1B4332]">League Competitions</h2>
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
              <h2 className="text-2xl font-bold text-[#1B4332] mt-8">Knockout Competitions</h2>
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
