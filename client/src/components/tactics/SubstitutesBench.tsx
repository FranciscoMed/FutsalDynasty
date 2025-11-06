import { useDrop } from "react-dnd";
import { PlayerMarker, ItemTypes } from "./PlayerMarker";
import type { Player } from "@/../../shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SubstitutesBenchProps {
  substitutes: (Player | null)[];
  onPlayerDrop: (player: Player, index: number) => void;
  onSlotClick: (index: number) => void;
}

function SubstituteSlot({ 
  player, 
  index, 
  onDrop, 
  onClick 
}: { 
  player: Player | null; 
  index: number; 
  onDrop: (player: Player, index: number) => void;
  onClick: () => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.PLAYER,
    drop: (item: { player: Player }) => {
      onDrop(item.player, index);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [index, onDrop]);

  return (
    <div
      ref={drop}
      className={`
        relative w-14 h-14 rounded-full border-2
        flex items-center justify-center
        transition-all duration-200
        cursor-pointer
        ${player 
          ? "border-primary bg-card" 
          : "border-dashed border-border bg-transparent"
        }
        ${isOver && canDrop ? "border-primary bg-primary/10 scale-110" : ""}
        ${!player && "hover:border-primary hover:bg-primary/5"}
      `}
      onClick={!player ? onClick : undefined}
    >
      {player ? (
        <div className="relative group">
          <PlayerMarker 
            player={player} 
            isGoalkeeper={player.position === "Goalkeeper"}
            onClick={onClick}
            size="sm"
          />
          {/* Tooltip on hover */}
          <div className="
            absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            pointer-events-none
            z-10
          ">
            <div className="bg-slate-950 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {player.name}
            </div>
          </div>
        </div>
      ) : (
        <span className="text-lg text-muted-foreground">+</span>
      )}
    </div>
  );
}

export function SubstitutesBench({ 
  substitutes, 
  onPlayerDrop, 
  onSlotClick 
}: SubstitutesBenchProps) {
  const filledCount = substitutes.filter(p => p !== null).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Substitutes Bench</span>
          <span className="text-sm font-normal text-muted-foreground">
            {filledCount}/5
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-4">
          {substitutes.map((player, index) => (
            <SubstituteSlot
              key={index}
              player={player}
              index={index}
              onDrop={onPlayerDrop}
              onClick={() => onSlotClick(index)}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center mt-3">
          Drag players here or click empty slots to assign substitutes
        </p>
      </CardContent>
    </Card>
  );
}
