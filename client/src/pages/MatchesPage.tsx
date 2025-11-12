import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Play, MapPin } from "lucide-react";
import { format } from "date-fns";

interface UpcomingFixture {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  date: string;
  venue: string;
  competitionName: string;
  competitionType: string;
  homeScore?: number;
  awayScore?: number;
  played: boolean;
}

export function MatchesPage() {
  const { gameState, loadGameData, loading } = useFutsalManager();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch all matches (both played and unplayed) with caching - single optimized call
  const { data: allMatches = [], isLoading: loadingMatches } = useQuery<UpcomingFixture[]>({
    queryKey: ["matches", "all"],
    queryFn: async () => {
      const response = await fetch("/api/matches");
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
    enabled: !!gameState,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Compute upcoming fixtures from cached match data
  const upcomingFixtures = useMemo(() => {
    if (!gameState) return [];
    
    return allMatches
      .filter(m => !m.played)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allMatches, gameState]);

  // Compute recent results from cached match data
  const recentResults = useMemo(() => {
    if (!gameState) return [];
    
    return allMatches
      .filter(m => m.played)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [allMatches, gameState]);

  // Mutation for simulating a match
  const simulateMatchMutation = useMutation({
    mutationFn: async (matchId: number) => {
      const response = await fetch(`/api/matches/${matchId}/simulate`, { 
        method: "POST" 
      });
      if (!response.ok) throw new Error("Failed to simulate match");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch match queries
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      loadGameData();
    },
  });

  const handlePlayMatch = (matchId: number) => {
    // Navigate to the match page to start the simulation flow
    setLocation(`/match/${matchId}`);
  };

  // Group fixtures by competition with memoization
  const fixturesByCompetition = useMemo(() => {
    return upcomingFixtures.reduce((acc, fixture) => {
      if (!acc[fixture.competitionName]) {
        acc[fixture.competitionName] = [];
      }
      acc[fixture.competitionName].push(fixture);
      return acc;
    }, {} as Record<string, UpcomingFixture[]>);
  }, [upcomingFixtures]);

  if (loading || loadingMatches || !gameState) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading matches...</p>
      </div>
    );
  }

  const canSimulateMatch = (matchDate: string) => {
    if (!gameState?.currentDate) return false;
    const currentDate = new Date(gameState.currentDate).setHours(0, 0, 0, 0);
    const fixtureDate = new Date(matchDate).setHours(0, 0, 0, 0);
    return fixtureDate === currentDate;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Matches</h1>
        <p className="text-muted-foreground">
          Your upcoming fixtures and recent results
        </p>
      </div>

      {upcomingFixtures.length === 0 && recentResults.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No matches available</p>
              <p className="text-sm mt-2">Your fixtures will appear when competitions begin</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Upcoming Fixtures by Competition */}
          {Object.entries(fixturesByCompetition).map(([competitionName, fixtures]) => (
            <Card key={competitionName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#2D6A4F]" />
                  {competitionName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fixtures.map((match) => {
                    const isHomeGame = match.homeTeamId === gameState?.playerTeamId;
                    const canSimulate = canSimulateMatch(match.date);
                    
                    return (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="text-center flex-1">
                              <p className={`font-medium ${isHomeGame ? "text-[#1B4332] font-bold" : ""}`}>
                                {match.homeTeamName}
                              </p>
                            </div>
                            <div className="text-2xl font-bold text-muted-foreground px-4">
                              VS
                            </div>
                            <div className="text-center flex-1">
                              <p className={`font-medium ${!isHomeGame ? "text-[#1B4332] font-bold" : ""}`}>
                                {match.awayTeamName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(match.date), "MMM d, yyyy")}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {match.venue}
                            </span>
                            <Badge 
                              variant={isHomeGame ? "default" : "secondary"}
                              className={isHomeGame ? "bg-[#2D6A4F]" : ""}
                            >
                              {isHomeGame ? "Home" : "Away"}
                            </Badge>
                          </div>
                        </div>
                        {canSimulate && (
                          <Button
                            onClick={() => handlePlayMatch(match.id)}
                            className="flex items-center gap-2 ml-4 bg-[#2D6A4F] hover:bg-[#1B4332]"
                          >
                            <Play className="w-4 h-4" />
                            Play Match
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Recent Results */}
          {recentResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentResults.map((match) => {
                    const isHomeGame = match.homeTeamId === gameState?.playerTeamId;
                    const playerScore = isHomeGame ? match.homeScore : match.awayScore;
                    const opponentScore = isHomeGame ? match.awayScore : match.homeScore;
                    const won = playerScore! > opponentScore!;
                    const drawn = playerScore === opponentScore;
                    
                    return (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="text-center flex-1">
                              <p className={`font-medium ${isHomeGame ? "text-[#1B4332] font-bold" : ""}`}>
                                {match.homeTeamName}
                              </p>
                            </div>
                            <div className={`text-3xl font-bold px-6 ${won ? "text-green-600" : drawn ? "text-yellow-600" : "text-red-600"}`}>
                              {match.homeScore} - {match.awayScore}
                            </div>
                            <div className="text-center flex-1">
                              <p className={`font-medium ${!isHomeGame ? "text-[#1B4332] font-bold" : ""}`}>
                                {match.awayTeamName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{format(new Date(match.date), "MMM d, yyyy")}</span>
                            <Badge variant={won ? "default" : drawn ? "secondary" : "destructive"}>
                              {won ? "Win" : drawn ? "Draw" : "Loss"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
