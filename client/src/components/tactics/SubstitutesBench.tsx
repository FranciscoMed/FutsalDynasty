import { useDrop } from "react-dnd";
import { PlayerMarker, ItemTypes } from "./PlayerMarker";
import type { Player } from "@/../../shared/schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus } from "lucide-react";

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
    <div 
      ref={drop}
      className={`flex items-center gap-2 ${isOver && canDrop ? "scale-105" : ""}`}
    >
      {player ? (
        <>
          <div className="hover:scale-110 transition-transform">
            <PlayerMarker
              player={player}
              isGoalkeeper={player.position === "Goalkeeper"}
              onClick={onClick}
              size="md"
            />
          </div>
          <div className="flex flex-col gap-0.5 items-center">
            <div className="text-[11px] font-bold text-foreground whitespace-nowrap">
              {player.name}
            </div>
            <div className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap leading-tight">
              {getPositionAbbr(player.position)} | ⭐{Math.round(player.currentAbility / 10)}
            </div>
          </div>
        </>
      ) : (
        <button
          onClick={onClick}
          className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/40 bg-muted/30 hover:bg-muted/50 hover:border-foreground transition-all cursor-pointer flex items-center justify-center"
        >
          <Plus className="w-5 h-5 text-muted-foreground" />
        </button>
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Substitutes</h3>
        <span className="text-xs text-muted-foreground">{filledCount}/5</span>
      </div>
      
      <div className="flex flex-col gap-3 flex-1 justify-center">
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
    </div>
  );
}
