import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import type { Match } from "@shared/schema";

interface KnockoutMatch extends Match {
  homeTeamName?: string;
  awayTeamName?: string;
}

interface KnockoutBracketProps {
  competitionName: string;
  matches: Match[];
  playerTeamId: number;
}

export function KnockoutBracket({
  competitionName,
  matches,
  playerTeamId,
}: KnockoutBracketProps) {
  // For now, display all knockout matches in chronological order
  // TODO: Add round support when schema is updated
  const sortedMatches = [...matches].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const getMatchResult = (match: KnockoutMatch) => {
    if (!match.played) return null;
    
    const homeWon = (match.homeScore || 0) > (match.awayScore || 0);
    const awayWon = (match.awayScore || 0) > (match.homeScore || 0);
    const isDraw = match.homeScore === match.awayScore;
    
    return { homeWon, awayWon, isDraw };
  };

  const isPlayerTeamMatch = (match: KnockoutMatch) => {
    return match.homeTeamId === playerTeamId || match.awayTeamId === playerTeamId;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#2D6A4F]" />
          {competitionName} - Knockout Stage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedMatches.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
              {sortedMatches.map((match) => {
                const result = getMatchResult(match);
                const isPlayerMatch = isPlayerTeamMatch(match);
                const isHomePlayerTeam = match.homeTeamId === playerTeamId;
                const isAwayPlayerTeam = match.awayTeamId === playerTeamId;
                
                // Try to get team names from enriched data or fall back to team IDs
                const enrichedMatch = match as KnockoutMatch;
                const homeTeamName = enrichedMatch.homeTeamName || `Team ${match.homeTeamId}`;
                const awayTeamName = enrichedMatch.awayTeamName || `Team ${match.awayTeamId}`;
                
                return (
                  <div
                    key={match.id}
                    className={`p-4 rounded-lg border ${
                      isPlayerMatch ? "border-[#2D6A4F] bg-[#2D6A4F]/5" : "border-border"
                    }`}
                  >
                    {/* Home Team */}
                    <div
                      className={`flex items-center justify-between p-3 rounded-t ${
                        match.played && result?.homeWon
                          ? "bg-green-500/10"
                          : match.played && !result?.homeWon && !result?.isDraw
                          ? "bg-gray-100"
                          : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {isHomePlayerTeam && (
                          <Badge className="bg-[#1B4332] text-xs">YOU</Badge>
                        )}
                        <span
                          className={`font-medium ${
                            isHomePlayerTeam ? "text-[#1B4332] font-bold" : ""
                          } ${
                            match.played && result?.homeWon ? "font-bold" : ""
                          }`}
                        >
                          {homeTeamName}
                        </span>
                      </div>
                      {match.played && (
                        <span className="text-xl font-bold ml-4 w-8 text-right">
                          {match.homeScore}
                        </span>
                      )}
                    </div>
                    
                    {/* Away Team */}
                    <div
                      className={`flex items-center justify-between p-3 rounded-b border-t ${
                        match.played && result?.awayWon
                          ? "bg-green-500/10"
                          : match.played && !result?.awayWon && !result?.isDraw
                          ? "bg-gray-100"
                          : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {isAwayPlayerTeam && (
                          <Badge className="bg-[#1B4332] text-xs">YOU</Badge>
                        )}
                        <span
                          className={`font-medium ${
                            isAwayPlayerTeam ? "text-[#1B4332] font-bold" : ""
                          } ${
                            match.played && result?.awayWon ? "font-bold" : ""
                          }`}
                        >
                          {awayTeamName}
                        </span>
                      </div>
                      {match.played && (
                        <span className="text-xl font-bold ml-4 w-8 text-right">
                          {match.awayScore}
                        </span>
                      )}
                    </div>
                    
                    {!match.played && (
                      <div className="mt-2 text-center">
                        <Badge variant="outline" className="text-xs">
                          Not Played
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No knockout matches yet</p>
              <p className="text-sm mt-2">The knockout stage will begin after the group stage concludes</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
