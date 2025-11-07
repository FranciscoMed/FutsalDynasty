import { useDrag } from "react-dnd";
import { ItemTypes } from "./PlayerMarker";
import type { Player } from "@/../../shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface PlayerPoolProps {
  players: Player[];
  assignments: Record<string, Player | null>;
  substitutes: (Player | null)[];
  onPlayerClick: (player: Player) => void;
}

function DraggablePlayerCard({ player, onClick }: { player: Player; onClick: () => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PLAYER,
    item: { player },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [player]);

  // Get player rating (0-20 scale)
  const getPlayerRating = (player: Player) => {
    return Math.round(player.currentAbility / 10);
  };

  // Get position badge color
  const getPositionColor = (position: string) => {
    switch (position) {
      case "Goalkeeper": return "bg-red-700";
      case "Defender": return "bg-slate-700";
      case "Winger": return "bg-slate-600";
      case "Pivot": return "bg-slate-800";
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

  return (
    <button
      ref={drag}
      onClick={onClick}
      className={`flex items-center gap-2 p-2 rounded-lg border border-border hover:border-foreground hover:bg-muted/50 transition-colors text-left cursor-pointer
        ${isDragging ? "opacity-50" : ""}
      `}
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
          <span className="text-xs font-bold text-foreground">
            ⭐ {getPlayerRating(player)}
          </span>
        </div>
      </div>
    </button>
  );
}

export function PlayerPool({ 
  players, 
  assignments, 
  substitutes,
  onPlayerClick 
}: PlayerPoolProps) {
  // Get assigned player IDs
  const assignedFieldIds = new Set(
    Object.values(assignments).filter(p => p !== null).map(p => p!.id)
  );
  const assignedBenchIds = new Set(
    substitutes.filter(p => p !== null).map(p => p!.id)
  );

  // Filter available players and sort by rating
  const availablePlayers = players
    .filter(p => !assignedFieldIds.has(p.id) && !assignedBenchIds.has(p.id))
    .sort((a, b) => b.currentAbility - a.currentAbility);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Available Players ({availablePlayers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 max-h-[520px] overflow-y-auto pr-2">
          {availablePlayers.map((player) => (
            <DraggablePlayerCard
              key={player.id}
              player={player}
              onClick={() => onPlayerClick(player)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
