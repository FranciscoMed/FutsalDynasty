import { useDrop } from "react-dnd";
import { PlayerMarker, ItemTypes } from "./PlayerMarker";
import type { Player } from "@/../../shared/schema";
import type { PositionSlot as PositionSlotType } from "@/lib/formations";

interface PositionSlotProps {
  slot: PositionSlotType;
  player: Player | null;
  onDrop: (player: Player, slotId: string) => void;
  onClick: () => void;
}

export function PositionSlot({ slot, player, onDrop, onClick }: PositionSlotProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.PLAYER,
    drop: (item: { player: Player }) => {
      onDrop(item.player, slot.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [slot.id, onDrop]);

  const isGoalkeeper = slot.role === "Goalkeeper";

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
      className="absolute"
      style={{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {player ? (
        // Player marker - draggable with labels
        <div className="relative flex flex-col items-center gap-0.5 hover:scale-110 transition-transform">
          <PlayerMarker 
            player={player} 
            isGoalkeeper={isGoalkeeper}
            onClick={onClick}
            size="md"
          />
          <div 
            className="text-[9px] font-bold text-white whitespace-nowrap"
            style={{
              textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 4px #000'
            }}
          >
            {player.name.split(" ").pop()}
          </div>
          <div className="text-[9px] font-bold text-white bg-black/70 px-1.5 py-0.5 rounded whitespace-nowrap">
            {getPositionAbbr(player.position)} | ⭐{Math.round(player.currentAbility / 10)}
          </div>
        </div>
      ) : (
        // Empty slot - clickable
        <div 
          onClick={onClick}
          className={`w-10 h-10 rounded-full border-2 border-dashed border-white/60 bg-white/10 hover:bg-white/20 transition-colors cursor-pointer
            ${isOver && canDrop ? "border-white bg-white/30 scale-110" : ""}
          `}
        />
      )}
    </div>
  );
}
