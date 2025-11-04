import { useEffect, useState } from "react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Play } from "lucide-react";
import { format } from "date-fns";
import type { Match, Competition } from "@shared/schema";

export function MatchesPage() {
  const { gameState, loadGameData, loading, initialized } = useFutsalManager();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [simulating, setSimulating] = useState<number | null>(null);

  useEffect(() => {
    if (initialized) {
      loadGameData();
      loadCompetitions();
    }
  }, [initialized]);

  const loadCompetitions = async () => {
    try {
      const response = await fetch("/api/competitions");
      if (response.ok) {
        const data = await response.json();
        setCompetitions(data);
      }
    } catch (error) {
      console.error("Failed to load competitions:", error);
    }
  };

  const handleSimulateMatch = async (matchId: number) => {
    setSimulating(matchId);
    try {
      await fetch(`/api/matches/${matchId}/simulate`, { method: "POST" });
      await loadCompetitions();
      await loadGameData();
    } catch (error) {
      console.error("Failed to simulate match:", error);
    } finally {
      setSimulating(null);
    }
  };

  if (loading || !gameState) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading matches...</p>
      </div>
    );
  }

  const allMatches = competitions.flatMap(c => c.fixtures);
  const upcomingMatches = allMatches.filter(m => !m.played).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  ).slice(0, 5);
  const recentMatches = allMatches.filter(m => m.played).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Matches</h1>
        <p className="text-muted-foreground">
          Manage your fixtures and view results
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingMatches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No upcoming matches</p>
                  <p className="text-sm mt-2">Check back later for your next fixture</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMatches.map((match) => {
                    const competition = competitions.find(c => c.id === match.competitionId);
                    return (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="text-center flex-1">
                              <p className="font-medium">Home Team {match.homeTeamId}</p>
                            </div>
                            <div className="text-2xl font-bold text-muted-foreground px-4">
                              VS
                            </div>
                            <div className="text-center flex-1">
                              <p className="font-medium">Away Team {match.awayTeamId}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{format(new Date(match.date), "MMM d, yyyy")}</span>
                            <Badge variant="outline">{competition?.name || "League"}</Badge>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSimulateMatch(match.id)}
                          disabled={simulating === match.id}
                          className="flex items-center gap-2 ml-4"
                        >
                          <Play className="w-4 h-4" />
                          {simulating === match.id ? "Simulating..." : "Play Match"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Results</CardTitle>
            </CardHeader>
            <CardContent>
              {recentMatches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No matches played yet</p>
                  <p className="text-sm mt-2">Play your first match to see results here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMatches.map((match) => {
                    const competition = competitions.find(c => c.id === match.competitionId);
                    return (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="text-center flex-1">
                              <p className="font-medium">Home Team {match.homeTeamId}</p>
                            </div>
                            <div className="text-3xl font-bold px-6">
                              {match.homeScore} - {match.awayScore}
                            </div>
                            <div className="text-center flex-1">
                              <p className="font-medium">Away Team {match.awayTeamId}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{format(new Date(match.date), "MMM d, yyyy")}</span>
                            <Badge variant="outline">{competition?.name || "League"}</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {competitions.map((competition) => (
            <Card key={competition.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    {competition.name} - Standings
                  </span>
                  <Badge variant="outline">
                    Matchday {competition.currentMatchday} / {competition.totalMatchdays}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-4 text-sm font-medium">Pos</th>
                        <th className="text-left py-2 px-4 text-sm font-medium">Team</th>
                        <th className="text-center py-2 px-4 text-sm font-medium">P</th>
                        <th className="text-center py-2 px-4 text-sm font-medium">W</th>
                        <th className="text-center py-2 px-4 text-sm font-medium">D</th>
                        <th className="text-center py-2 px-4 text-sm font-medium">L</th>
                        <th className="text-center py-2 px-4 text-sm font-medium">GF</th>
                        <th className="text-center py-2 px-4 text-sm font-medium">GA</th>
                        <th className="text-center py-2 px-4 text-sm font-medium">GD</th>
                        <th className="text-center py-2 px-4 text-sm font-medium">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competition.standings.map((standing, index) => (
                        <tr key={standing.teamId} className="border-b border-border hover:bg-muted">
                          <td className="py-3 px-4 text-sm font-medium">{index + 1}</td>
                          <td className="py-3 px-4 text-sm">Team {standing.teamId}</td>
                          <td className="py-3 px-4 text-sm text-center">{standing.played}</td>
                          <td className="py-3 px-4 text-sm text-center">{standing.won}</td>
                          <td className="py-3 px-4 text-sm text-center">{standing.drawn}</td>
                          <td className="py-3 px-4 text-sm text-center">{standing.lost}</td>
                          <td className="py-3 px-4 text-sm text-center">{standing.goalsFor}</td>
                          <td className="py-3 px-4 text-sm text-center">{standing.goalsAgainst}</td>
                          <td className="py-3 px-4 text-sm text-center font-medium">{standing.goalDifference}</td>
                          <td className="py-3 px-4 text-sm text-center font-bold">{standing.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
