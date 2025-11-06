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
        border-[3px]
        flex items-center justify-center
        cursor-pointer
        transition-all duration-200
        hover:scale-110
        ${isDragging ? "opacity-50 scale-95" : ""}
        ${isGoalkeeper 
          ? "border-green-200 bg-gradient-to-b from-green-700 via-green-700 to-green-200" 
          : "border-white bg-gradient-to-b from-green-500 via-green-500 to-white"
        }
        shadow-lg
      `}
      style={{
        backgroundSize: "100% 100%",
      }}
      title={player.name}
    >
      <span 
        className={`
          ${numberSize[size]}
          font-bold text-white 
          drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]
        `}
      >
        {player.id % 100 || "?"}
      </span>
    </div>
  );
}

export { ItemTypes };
