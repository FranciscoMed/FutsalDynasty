import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Users, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PostMatchData {
  match: {
    id: number;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    competitionName: string;
    date: string;
    isHome: boolean;
  };
  standings: Array<{
    position: number;
    teamId: number;
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    isPlayerTeam: boolean;
  }>;
  nextMatch?: {
    id: number;
    opponent: string;
    date: string;
    isHome: boolean;
  };
  playerPerformance?: {
    topScorer?: { name: string; goals: number };
    topRated?: { name: string; rating: number };
  };
}

export default function PostMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [, setLocation] = useLocation();
  const [currentTab, setCurrentTab] = useState("overview");

  const { data, isLoading, error } = useQuery<PostMatchData>({
    queryKey: ["postMatch", matchId],
    queryFn: async () => {
      const response = await fetch(`/api/matches/${matchId}/post-match`);
      if (!response.ok) throw new Error("Failed to fetch post-match data");
      return response.json();
    },
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading match results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load post-match data. Please try again.
              </AlertDescription>
            </Alert>
            <Button onClick={() => setLocation("/matches")} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Matches
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { match, standings, nextMatch, playerPerformance } = data;
  const playerTeam = match.isHome ? match.homeTeamName : match.awayTeamName;
  const opponentTeam = match.isHome ? match.awayTeamName : match.homeTeamName;
  const playerScore = match.isHome ? match.homeScore : match.awayScore;
  const opponentScore = match.isHome ? match.awayScore : match.homeScore;
  
  const matchResult = playerScore > opponentScore ? "win" : playerScore < opponentScore ? "loss" : "draw";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => setLocation("/matches")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Matches
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-[#2D6A4F]" />
          <h1 className="text-3xl font-bold text-foreground">Match Result</h1>
        </div>
        <p className="text-muted-foreground">{match.competitionName}</p>
      </div>

      {/* Result Summary Card */}
      <Card className="border-2 border-[#2D6A4F]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {/* Player Team */}
            <div className="flex-1 text-center">
              <h2 className="text-2xl font-bold mb-2">{playerTeam}</h2>
              <div className="text-6xl font-bold text-[#2D6A4F]">{playerScore}</div>
            </div>

            {/* VS & Result Badge */}
            <div className="flex flex-col items-center gap-4 px-8">
              <span className="text-2xl font-semibold text-muted-foreground">VS</span>
              <Badge 
                variant={matchResult === "win" ? "default" : matchResult === "loss" ? "destructive" : "secondary"}
                className={`text-lg px-4 py-2 ${matchResult === "win" ? "bg-green-600" : ""}`}
              >
                {matchResult === "win" ? "VICTORY" : matchResult === "loss" ? "DEFEAT" : "DRAW"}
              </Badge>
            </div>

            {/* Opponent Team */}
            <div className="flex-1 text-center">
              <h2 className="text-2xl font-bold mb-2">{opponentTeam}</h2>
              <div className="text-6xl font-bold text-muted-foreground">{opponentScore}</div>
            </div>
          </div>

          {/* Match Info */}
          <div className="mt-6 pt-6 border-t flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span>📍 {match.isHome ? "Home" : "Away"}</span>
            <span>•</span>
            <span>📅 {new Date(match.date).toLocaleDateString()}</span>
            <span>•</span>
            <CheckCircle2 className="w-4 h-4 inline text-green-600" />
            <span className="text-green-600">Standings Updated</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Details */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <Trophy className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="standings">
            <TrendingUp className="w-4 h-4 mr-2" />
            Standings
          </TabsTrigger>
          <TabsTrigger value="squad">
            <Users className="w-4 h-4 mr-2" />
            Squad Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Match Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Match Complete!</strong> Your team has {matchResult === "win" ? "won" : matchResult === "loss" ? "lost" : "drawn"} this match.
                  The league standings have been updated automatically.
                </AlertDescription>
              </Alert>

              {playerPerformance && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {playerPerformance.topScorer && (
                    <div className="p-4 border rounded-lg bg-accent/50">
                      <div className="text-sm text-muted-foreground mb-1">Top Scorer</div>
                      <div className="font-semibold text-lg">{playerPerformance.topScorer.name}</div>
                      <div className="text-2xl font-bold text-[#2D6A4F]">
                        {playerPerformance.topScorer.goals} goal{playerPerformance.topScorer.goals !== 1 ? "s" : ""}
                      </div>
                    </div>
                  )}
                  {playerPerformance.topRated && (
                    <div className="p-4 border rounded-lg bg-accent/50">
                      <div className="text-sm text-muted-foreground mb-1">Top Rated Player</div>
                      <div className="font-semibold text-lg">{playerPerformance.topRated.name}</div>
                      <div className="text-2xl font-bold text-[#2D6A4F]">
                        {playerPerformance.topRated.rating.toFixed(1)} rating
                      </div>
                    </div>
                  )}
                </div>
              )}

              {nextMatch && (
                <div className="p-4 border rounded-lg bg-muted">
                  <div className="text-sm font-semibold text-muted-foreground mb-2">Next Match</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">
                        {nextMatch.isHome ? "vs" : "@"} {nextMatch.opponent}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(nextMatch.date).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setLocation(`/matches/${nextMatch.id}/preparation`)}
                    >
                      Prepare
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{match.competitionName} - Standings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-4">Team</th>
                      <th className="text-center py-2 px-2">P</th>
                      <th className="text-center py-2 px-2">W</th>
                      <th className="text-center py-2 px-2">D</th>
                      <th className="text-center py-2 px-2">L</th>
                      <th className="text-center py-2 px-2">GF</th>
                      <th className="text-center py-2 px-2">GA</th>
                      <th className="text-center py-2 px-2">GD</th>
                      <th className="text-center py-2 px-2 font-bold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team) => (
                      <tr
                        key={team.teamId}
                        className={`border-b ${
                          team.isPlayerTeam ? "bg-[#2D6A4F]/10 font-semibold" : ""
                        }`}
                      >
                        <td className="py-3 px-2">{team.position}</td>
                        <td className="py-3 px-4">
                          {team.teamName}
                          {team.isPlayerTeam && (
                            <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                          )}
                        </td>
                        <td className="text-center py-3 px-2">{team.played}</td>
                        <td className="text-center py-3 px-2">{team.won}</td>
                        <td className="text-center py-3 px-2">{team.drawn}</td>
                        <td className="text-center py-3 px-2">{team.lost}</td>
                        <td className="text-center py-3 px-2">{team.goalsFor}</td>
                        <td className="text-center py-3 px-2">{team.goalsAgainst}</td>
                        <td className="text-center py-3 px-2">
                          {team.goalDifference > 0 ? "+" : ""}
                          {team.goalDifference}
                        </td>
                        <td className="text-center py-3 px-2 font-bold">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="squad" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Squad Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Detailed squad statistics will be available here. This includes individual player ratings,
                  goals, assists, and other match statistics.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => setLocation("/matches")}
          variant="outline"
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Matches
        </Button>
        <Button
          onClick={() => setLocation("/inbox")}
          className="flex-1 bg-[#2D6A4F] hover:bg-[#1B4332]"
        >
          View Match Report
        </Button>
      </div>
    </div>
  );
}
