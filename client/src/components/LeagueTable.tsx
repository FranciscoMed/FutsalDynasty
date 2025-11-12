import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTopScorers, useTopAssisters, useTopCleanSheets, useDisciplineStats } from "@/hooks/useServerState";

interface Standing {
  teamId: number;
  teamName?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: string[];
}

interface LeagueTableProps {
  competitionId: number;
  competitionName: string;
  standings: Standing[];
  playerTeamId: number;
  currentMatchday?: number;
  totalMatchdays?: number;
}

export function LeagueTable({
  competitionId,
  competitionName,
  standings,
  playerTeamId,
  currentMatchday,
  totalMatchdays,
}: LeagueTableProps) {
  const [activeTab, setActiveTab] = useState<"standings" | "scorers" | "assisters" | "cleansheets" | "discipline">("standings");

  const { data: topScorers, isLoading: loadingScorers } = useTopScorers(competitionId, 10);
  const { data: topAssisters, isLoading: loadingAssisters } = useTopAssisters(competitionId, 10);
  const { data: cleanSheets, isLoading: loadingCleanSheets } = useTopCleanSheets(competitionId, 10);
  const { data: disciplineStats, isLoading: loadingDiscipline } = useDisciplineStats(competitionId);

  const getPositionColor = (position: number, total: number) => {
    // Top 3 positions get special highlighting
    if (position === 1) return "bg-yellow-500/10 border-l-4 border-yellow-500";
    if (position === 2) return "bg-gray-300/10 border-l-4 border-gray-400";
    if (position === 3) return "bg-orange-300/10 border-l-4 border-orange-400";
    
    // Bottom 3 positions (relegation zone)
    if (position > total - 3) return "bg-red-500/10 border-l-4 border-red-500";
    
    return "";
  };

  const getFormBadgeClassName = (result: string) => {
    if (result === "W") return "bg-green-700 hover:bg-green-600 text-white border-green-700";
    if (result === "D") return "bg-yellow-600 hover:bg-yellow-500 text-white border-gray-400";
    return "bg-red-700 hover:bg-red-600 text-white border-red-600";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-default">{competitionName}</span>
          {currentMatchday && totalMatchdays && (
            <Badge variant="outline" className="text-sm">
              Matchday {currentMatchday} / {totalMatchdays}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab("standings")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "standings"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Standings
          </button>
          <button
            onClick={() => setActiveTab("scorers")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "scorers"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Top Scorers
          </button>
          <button
            onClick={() => setActiveTab("assisters")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "assisters"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Top Assisters
          </button>
          <button
            onClick={() => setActiveTab("cleansheets")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "cleansheets"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Clean Sheets
          </button>
          <button
            onClick={() => setActiveTab("discipline")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "discipline"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Discipline
          </button>
        </div>

        {/* Standings Tab */}
        {activeTab === "standings" && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-xs font-medium w-12">Pos</th>
                <th className="text-left py-2 px-4 text-xs font-medium">Team</th>
                <th className="text-center py-2 px-2 text-xs font-medium w-12">P</th>
                <th className="text-center py-2 px-2 text-xs font-medium w-12">W</th>
                <th className="text-center py-2 px-2 text-xs font-medium w-12">D</th>
                <th className="text-center py-2 px-2 text-xs font-medium w-12">L</th>
                <th className="text-center py-2 px-2 text-xs font-medium w-12">GF</th>
                <th className="text-center py-2 px-2 text-xs font-medium w-12">GA</th>
                <th className="text-center py-2 px-2 text-xs font-medium w-12">GD</th>
                <th className="text-center py-2 px-2 text-xs font-medium w-12">Pts</th>
                {standings.some(s => s.form && s.form.length > 0) && (
                  <th className="text-left py-2 px-4 text-xs font-medium min-w-[120px]">Form</th>
                )}
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => {
                const position = index + 1;
                const isPlayerTeam = standing.teamId === playerTeamId;
                const positionClass = getPositionColor(position, standings.length);
                
                return (
                  <tr
                    key={standing.teamId}
                    className={`border-b border-border hover:bg-muted transition-colors ${
                      isPlayerTeam ? "bg-[#2D6A4F]/10 font-bold" : ""
                    } ${positionClass}`}
                  >
                    <td className="py-3 px-2 text-sm font-medium text-center">
                      {position}
                    </td>
                    <td className={`py-3 px-4 text-sm ${isPlayerTeam ? "text-primary font-bold" : ""}`}>
                      {standing.teamName || `Team ${standing.teamId}`}
                    </td>
                    <td className="py-3 px-2 text-sm text-center">{standing.played}</td>
                    <td className="py-3 px-2 text-sm text-center text-green-700 font-medium">
                      {standing.won}
                    </td>
                    <td className="py-3 px-2 text-sm text-center text-yellow-600 font-medium">
                      {standing.drawn}
                    </td>
                    <td className="py-3 px-2 text-sm text-center text-red-600 font-medium">
                      {standing.lost}
                    </td>
                    <td className="py-3 px-2 text-sm text-center">{standing.goalsFor}</td>
                    <td className="py-3 px-2 text-sm text-center">{standing.goalsAgainst}</td>
                    <td className={`py-3 px-2 text-sm text-center font-medium ${
                      standing.goalDifference > 0 ? "text-green-600" : 
                      standing.goalDifference < 0 ? "text-red-600" : ""
                    }`}>
                      {standing.goalDifference > 0 ? "+" : ""}{standing.goalDifference}
                    </td>
                    <td className="py-3 px-2 text-sm text-center font-bold text-[#1B4332]">
                      {standing.points}
                    </td>
                    {standing.form && standing.form.length > 0 && (
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {standing.form.slice(-5).map((result, idx) => (
                            <div
                              key={idx}
                              className={`w-6 h-6 flex items-center justify-center rounded-sm text-xs font-semibold ${getFormBadgeClassName(result)}`}
                            >
                              {result}
                            </div>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500/20 border-l-2 border-yellow-500"></div>
              <span>1st Place</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300/20 border-l-2 border-gray-400"></div>
              <span>2nd Place</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-300/20 border-l-2 border-orange-400"></div>
              <span>3rd Place</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500/20 border-l-2 border-red-500"></div>
              <span>Relegation Zone</span>
            </div>
          </div>
        </div>
        )}

        {/* Top Scorers Tab */}
        {activeTab === "scorers" && (
          <div>
            {loadingScorers ? (
              <div className="text-center py-8 text-muted-foreground">Loading top scorers...</div>
            ) : topScorers && topScorers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">#</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Player</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Team</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Goals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topScorers.map((player, index) => (
                      <tr key={player.playerId} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm text-muted-foreground">{index + 1}</td>
                        <td className="py-3 px-4 text-sm font-medium">{player.playerName}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{player.teamName}</td>
                        <td className="py-3 px-4 text-sm text-center font-bold text-primary">{player.goals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No goals scored yet</div>
            )}
          </div>
        )}

        {/* Top Assisters Tab */}
        {activeTab === "assisters" && (
          <div>
            {loadingAssisters ? (
              <div className="text-center py-8 text-muted-foreground">Loading top assisters...</div>
            ) : topAssisters && topAssisters.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">#</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Player</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Team</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Assists</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAssisters.map((player, index) => (
                      <tr key={player.playerId} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm text-muted-foreground">{index + 1}</td>
                        <td className="py-3 px-4 text-sm font-medium">{player.playerName}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{player.teamName}</td>
                        <td className="py-3 px-4 text-sm text-center font-bold text-primary">{player.assists}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No assists recorded yet</div>
            )}
          </div>
        )}

        {/* Clean Sheets Tab */}
        {activeTab === "cleansheets" && (
          <div>
            {loadingCleanSheets ? (
              <div className="text-center py-8 text-muted-foreground">Loading clean sheets...</div>
            ) : cleanSheets && cleanSheets.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">#</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Player</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Team</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Clean Sheets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cleanSheets.map((player, index) => (
                      <tr key={player.playerId} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm text-muted-foreground">{index + 1}</td>
                        <td className="py-3 px-4 text-sm font-medium">{player.playerName}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{player.teamName}</td>
                        <td className="py-3 px-4 text-sm text-center font-bold text-primary">{player.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No clean sheets yet</div>
            )}
          </div>
        )}

        {/* Discipline Tab */}
        {activeTab === "discipline" && (
          <div>
            {loadingDiscipline ? (
              <div className="text-center py-8 text-muted-foreground">Loading discipline stats...</div>
            ) : disciplineStats && disciplineStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">#</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Player</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Team</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Yellow Cards</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Red Cards</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disciplineStats.map((player, index) => (
                      <tr key={player.playerId} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm text-muted-foreground">{index + 1}</td>
                        <td className="py-3 px-4 text-sm font-medium">{player.playerName}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{player.teamName}</td>
                        <td className="py-3 px-4 text-sm text-center font-bold text-yellow-600">{player.yellowCards}</td>
                        <td className="py-3 px-4 text-sm text-center font-bold text-red-600">{player.redCards}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No disciplinary actions yet</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
