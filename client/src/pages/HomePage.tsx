import { useEffect, useState, useMemo } from "react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { useMatchDay } from "@/hooks/useMatchDay";
import { MatchPreparationPopup } from "@/components/MatchPreparationPopup";
import { SeasonSummaryModal } from "@/components/SeasonSummaryModal";
import { ContinueButton } from "@/components/ContinueButton";
import { AdvancementOverlay } from "@/components/AdvancementOverlay";
import LeagueLeadersWidget from "@/components/LeagueLeadersWidget";
import { useAdvancementStore } from "@/lib/stores/advancementStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Mail, Calendar, TrendingUp, Users, Trophy, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

export function HomePage() {
  const { 
    playerTeam, 
    inboxMessages, 
    players,
    club,
    gameState,
    loadGameData,
    loading,
    initialized,
    pendingMatchId,
    showMatchPopup,
    setPendingMatch,
    setShowMatchPopup,
  } = useFutsalManager();

  const { nextMatch, hasMatchToday, refetch: refetchMatchDay } = useMatchDay();
  const { isAdvancing } = useAdvancementStore();
  const [showSeasonSummary, setShowSeasonSummary] = useState(false);

  // Fetch upcoming matches
  const { data: allMatches = [] } = useQuery<Array<{
    id: number;
    homeTeamId: number;
    awayTeamId: number;
    homeTeamName: string;
    awayTeamName: string;
    date: string;
    venue: string;
    competitionName: string;
    competitionType: string;
    played: boolean;
  }>>({
    queryKey: ["matches", "all"],
    queryFn: async () => {
      const response = await fetch("/api/matches");
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
    enabled: !!gameState,
    staleTime: 30000,
  });

  // Fetch competitions for standings
  const { data: competitions = [] } = useQuery<Array<{
    id: number;
    name: string;
    type: string;
    standings: Array<{
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
    }>;
  }>>({
    queryKey: ["competitions", false], // false = showAll=false (player's competitions only)
    queryFn: async () => {
      const response = await fetch("/api/competitions");
      if (!response.ok) throw new Error("Failed to fetch competitions");
      return response.json();
    },
    enabled: !!gameState,
    staleTime: 30000,
  });

  // Get next 3 upcoming matches
  const upcomingMatches = useMemo(() => {
    if (!gameState) return [];
    
    return allMatches
      .filter(m => !m.played)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [allMatches, gameState]);

  // Get player team's standings in all competitions
  const teamStandings = useMemo(() => {
    if (!playerTeam || !competitions) return [];
    
    return competitions
      .filter(comp => comp.type === "league")
      .map(comp => {
        const standing = comp.standings.find(s => s.teamId === playerTeam.id);
        if (!standing) return null;
        
        return {
          competitionName: comp.name,
          position: comp.standings.indexOf(standing) + 1,
          totalTeams: comp.standings.length,
          points: standing.points,
          played: standing.played,
        };
      })
      .filter(Boolean);
  }, [competitions, playerTeam]);

  // Debug logging for HomePage
  console.log('🏠 HomePage Debug:', {
    hasMatchToday,
    nextMatch: nextMatch ? {
      id: nextMatch.id,
      date: nextMatch.date,
      played: nextMatch.played,
      preparationStatus: nextMatch.preparationStatus,
      homeTeamName: nextMatch.homeTeamName,
      awayTeamName: nextMatch.awayTeamName,
    } : null,
    currentDate: gameState?.currentDate,
    showMatchPopup,
    pendingMatchId,
  });

  useEffect(() => {
    if (initialized) {
      loadGameData();
    }
  }, [initialized]);

  // Auto-show match preparation popup when match day is detected
  useEffect(() => {
    if (hasMatchToday && nextMatch && !showMatchPopup) {
      setPendingMatch(nextMatch.id);
      setShowMatchPopup(true);
    }
  }, [hasMatchToday, nextMatch, showMatchPopup, setPendingMatch, setShowMatchPopup]);

  const recentMessages = inboxMessages.slice(0, 5);
  const squadCount = players.length;
  const averageAge = players.length > 0 
    ? Math.round(players.reduce((sum, p) => sum + p.age, 0) / players.length)
    : 0;

  const handleContinueComplete = async (result?: { showSeasonSummary?: boolean }) => {
    // Reload game data after advancement completes
    await loadGameData();
    await refetchMatchDay();
    
    // Show season summary if season ended
    if (result?.showSeasonSummary) {
      setShowSeasonSummary(true);
    }
  };

  const handleCloseMatchPopup = () => {
    setShowMatchPopup(false);
    setPendingMatch(null);
    // Refetch to update match status
    refetchMatchDay();
  };
  
  const handleCloseSeasonSummary = () => {
    setShowSeasonSummary(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {playerTeam?.name || "No Team"}
        </h1>
        <p className="text-muted-foreground">
          Welcome back, Manager! Here's your overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Squad Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{squadCount}</div>
            <p className="text-xs text-muted-foreground">
              {squadCount >= 15 ? "Full squad" : `${15 - squadCount} slots available`}
            </p>
          </CardContent>
        </Card>

        <Link href="/competitions" className="block">
          <Card className="transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">League Position</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {teamStandings.length > 0 ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold">
                      {teamStandings[0].position}
                      <span className="text-base font-normal text-muted-foreground">
                        {teamStandings[0].position === 1 ? 'st' : 
                         teamStandings[0].position === 2 ? 'nd' : 
                         teamStandings[0].position === 3 ? 'rd' : 'th'}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">/ {teamStandings[0].totalTeams}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant={
                        teamStandings[0].position === 1 ? "default" : 
                        teamStandings[0].position <= 3 ? "secondary" : 
                        "outline"
                      }
                      className="text-xs"
                    >
                      {teamStandings[0].points} pts
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {teamStandings[0].played} {teamStandings[0].played === 1 ? 'game' : 'games'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-muted-foreground">-</div>
                  <p className="text-xs text-muted-foreground">Season not started</p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${club?.budget.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Available transfer funds
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-success/10 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Schedule
            </CardTitle>
            {gameState && (
              <div className="text-right">
                <div className="text-xs font-semibold text-foreground">
                  {format(new Date(gameState.currentDate), "MMM d, yyyy")}
                </div>
                <div className="text-xs text-muted-foreground">
                  Season {gameState.season}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ContinueButton
              onComplete={handleContinueComplete}
              className="w-full h-10 text-sm font-semibold"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming Matches
              </span>
              <Link href="/matches">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No upcoming matches</p>
                <p className="text-sm mt-2">Season will start soon</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMatches.map((match) => {
                  const isHome = match.homeTeamId === playerTeam?.id;
                  const opponent = isHome ? match.awayTeamName : match.homeTeamName;
                  const matchDate = new Date(match.date);
                  
                  return (
                    <div
                      key={match.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={isHome ? "default" : "outline"} className="text-xs">
                            {isHome ? "H" : "A"}
                          </Badge>
                          <p className="font-medium text-sm">vs {opponent}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {match.competitionName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(matchDate, "MMM d")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(matchDate, "HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Recent Inbox
              </span>
              <Link href="/inbox">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No messages yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMessages.map((message) => (
                  <div
                    key={message.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {!message.read && (
                          <div className="w-2 h-2 rounded-full bg-success" />
                        )}
                        <p className="font-medium text-sm">{message.subject}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {message.from}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {message.category}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Match Preparation Popup - appears automatically on match day */}
      {showMatchPopup && pendingMatchId && (
        <MatchPreparationPopup
          matchId={pendingMatchId}
          onClose={handleCloseMatchPopup}
        />
      )}

      {/* Advancement Overlay - shows during time advancement */}
      {isAdvancing && (
        <AdvancementOverlay
          onComplete={handleContinueComplete}
        />
      )}
      
      {/* Season Summary Modal - appears after season ends */}
      <SeasonSummaryModal
        open={showSeasonSummary}
        onClose={handleCloseSeasonSummary}
      />
    </div>
  );
}
