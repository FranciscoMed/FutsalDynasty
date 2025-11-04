import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  competitionName: string;
  standings: Standing[];
  playerTeamId: number;
  currentMatchday?: number;
  totalMatchdays?: number;
}

export function LeagueTable({
  competitionName,
  standings,
  playerTeamId,
  currentMatchday,
  totalMatchdays,
}: LeagueTableProps) {
  const getPositionColor = (position: number, total: number) => {
    // Top 3 positions get special highlighting
    if (position === 1) return "bg-yellow-500/10 border-l-4 border-yellow-500";
    if (position === 2) return "bg-gray-300/10 border-l-4 border-gray-400";
    if (position === 3) return "bg-orange-300/10 border-l-4 border-orange-400";
    
    // Bottom 3 positions (relegation zone)
    if (position > total - 3) return "bg-red-500/10 border-l-4 border-red-500";
    
    return "";
  };

  const getFormBadgeVariant = (result: string) => {
    if (result === "W") return "default";
    if (result === "D") return "secondary";
    return "destructive";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-[#1B4332]">{competitionName}</span>
          {currentMatchday && totalMatchdays && (
            <Badge variant="outline" className="text-sm">
              Matchday {currentMatchday} / {totalMatchdays}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                    <td className={`py-3 px-4 text-sm ${isPlayerTeam ? "text-[#1B4332] font-bold" : ""}`}>
                      {standing.teamName || `Team ${standing.teamId}`}
                    </td>
                    <td className="py-3 px-2 text-sm text-center">{standing.played}</td>
                    <td className="py-3 px-2 text-sm text-center text-green-600 font-medium">
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
                            <Badge
                              key={idx}
                              variant={getFormBadgeVariant(result)}
                              className="w-6 h-6 flex items-center justify-center p-0 text-xs"
                            >
                              {result}
                            </Badge>
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
      </CardContent>
    </Card>
  );
}
