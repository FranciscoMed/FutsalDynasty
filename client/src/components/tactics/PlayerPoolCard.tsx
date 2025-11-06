import { useDrag } from "react-dnd";
import { ItemTypes } from "./PlayerMarker";
import type { Player } from "@/../../shared/schema";
import { Badge } from "@/components/ui/badge";

interface PlayerPoolCardProps {
  player: Player;
  isAssigned: boolean;
  assignmentType?: "field" | "bench";
  onClick?: () => void;
}

export function PlayerPoolCard({ 
  player, 
  isAssigned, 
  assignmentType,
  onClick 
}: PlayerPoolCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PLAYER,
    item: { player },
    canDrag: !isAssigned,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [player, isAssigned]);

  const isGoalkeeper = player.position === "Goalkeeper";

  return (
    <div
      ref={drag}
      onClick={!isAssigned ? onClick : undefined}
      className={`
        p-3 rounded-lg border
        transition-all duration-200
        ${isAssigned 
          ? "bg-muted/50 border-border cursor-not-allowed opacity-60" 
          : "bg-card border-border hover:border-primary hover:shadow-md cursor-pointer"
        }
        ${isDragging ? "opacity-30" : ""}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Player avatar with gradient */}
        <div
          className={`
            w-12 h-12 rounded-full border-[3px] 
            flex items-center justify-center flex-shrink-0
            ${isGoalkeeper 
              ? "border-green-200 bg-gradient-to-b from-green-700 via-green-700 to-green-200" 
              : "border-white bg-gradient-to-b from-green-500 via-green-500 to-white"
            }
            shadow-lg
          `}
        >
          <span className="text-sm font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            {player.id % 100 || "?"}
          </span>
        </div>

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold truncate">{player.name}</p>
            {isAssigned && (
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {assignmentType === "field" ? "✓ Field" : "✓ Sub"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{player.position.toUpperCase()}</span>
            <span>•</span>
            <span>{player.currentAbility}/20</span>
          </div>
        </div>
      </div>
    </div>
  );
}
