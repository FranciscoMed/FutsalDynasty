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
      {/* Drop zone indicator */}
      <div
        className={`
          w-12 h-12 md:w-14 md:h-14
          rounded-full
          border-2 border-dashed
          flex items-center justify-center
          transition-all duration-200
          ${player ? "border-transparent" : "border-white/50"}
          ${isOver && canDrop ? "border-primary bg-white/20 scale-110" : ""}
          ${!player && "hover:border-white hover:bg-white/10"}
        `}
        onClick={!player ? onClick : undefined}
      >
        {player ? (
          <div className="relative">
            <PlayerMarker 
              player={player} 
              isGoalkeeper={isGoalkeeper}
              onClick={onClick}
            />
            {/* Player name label below */}
            <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <div className="bg-slate-950/85 text-white text-xs px-2 py-0.5 rounded-full">
                {player.name.split(" ").pop()}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-xs text-white/70 font-medium">
            {slot.role}
          </span>
        )}
      </div>
    </div>
  );
}
