import { useDrag } from "react-dnd";
import type { Player } from "@/../../shared/schema";

interface PlayerMarkerProps {
  player: Player | null;
  isGoalkeeper?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

const ItemTypes = {
  PLAYER: "player",
};

export function PlayerMarker({ 
  player, 
  isGoalkeeper = false, 
  onClick,
  size = "md" 
}: PlayerMarkerProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PLAYER,
    item: player ? { player } : null,
    canDrag: !!player,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [player]);

  if (!player) {
    return null;
  }

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10 md:w-12 md:h-12",
    lg: "w-12 h-12 md:w-14 md:h-14",
  };

  const numberSize = {
    sm: "text-xs",
    md: "text-sm md:text-base",
    lg: "text-base md:text-lg",
  };

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={`
        ${sizeClasses[size]}
        rounded-full
        border-2
        flex items-center justify-center
        cursor-pointer
        transition-all duration-200
        hover:scale-110
        ${isDragging ? "opacity-50 scale-95" : ""}
        ${isGoalkeeper 
          ? "bg-red-700 text-white border-black" 
          : "bg-white text-black border-black"
        }
        shadow-lg
      `}
      title={player.name}
    >
      <span 
        className={`
          ${numberSize[size]}
          font-bold
        `}
      >
        {player.id % 100 || "?"}
      </span>
    </div>
  );
}

export { ItemTypes };
