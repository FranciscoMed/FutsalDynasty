import type { Player } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface QuickPlayerSelectorProps {
  availablePlayers: Player[];
  onPlayerClick: (player: Player) => void;
}

export function QuickPlayerSelector({ availablePlayers, onPlayerClick }: QuickPlayerSelectorProps) {
  // Sort players by rating (currentAbility) descending
  const sortedPlayers = [...availablePlayers]
    .sort((a, b) => b.currentAbility - a.currentAbility);

  // Get player rating (0-20 scale)
  const getPlayerRating = (player: Player) => {
    return Math.round(player.currentAbility / 10);
  };

  // Get position badge color
  const getPositionColor = (position: string) => {
    switch (position) {
      case "Goalkeeper": return "bg-yellow-500";
      case "Defender": return "bg-blue-500";
      case "Winger": return "bg-green-500";
      case "Pivot": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  // Get position abbreviation
  const getPositionAbbr = (position: string) => {
    switch (position) {
      case "Goalkeeper": return "GK";
      case "Defender": return "DEF";
      case "Winger": return "WIN";
      case "Pivot": return "PIV";
      default: return position.substring(0, 3).toUpperCase();
    }
  };

  if (sortedPlayers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Available Players ({sortedPlayers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
          {sortedPlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => onPlayerClick(player)}
              className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-[#2D6A4F] hover:bg-[#2D6A4F]/5 transition-colors text-left"
            >
              <div className={`w-8 h-8 rounded-full ${getPositionColor(player.position)} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                {player.id % 100}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs truncate">{player.name}</p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold">
                    {getPositionAbbr(player.position)}
                  </Badge>
                  <span className="text-xs font-bold text-[#2D6A4F]">
                    ⭐ {getPlayerRating(player)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
