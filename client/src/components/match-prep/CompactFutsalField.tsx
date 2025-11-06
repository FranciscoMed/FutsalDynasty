import { FORMATIONS, Formation } from "@/lib/formations";
import type { Player } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CompactFutsalFieldProps {
  formation: Formation;
  assignments: Record<string, Player | null>;
  onSlotClick: (slotId: string) => void;
}

export function CompactFutsalField({ formation, assignments, onSlotClick }: CompactFutsalFieldProps) {
  const formationLayout = FORMATIONS[formation];

  // Get jersey number (player ID % 100)
  const getJerseyNumber = (player: Player) => {
    return player.id % 100;
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

  // Check if position is goalkeeper
  const isGoalkeeper = (slotId: string) => {
    return formationLayout.positions.find(p => p.id === slotId)?.role === "Goalkeeper";
  };

  return (
    <div className="relative w-[240px] h-[360px] rounded-lg border-2 border-gray-700 shadow-lg overflow-hidden bg-gradient-to-b from-green-600 via-green-500 to-green-600">
      {/* Field Background Image */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/fields/futsal-field.svg"
          alt="Futsal field"
          className="w-full h-full object-cover opacity-100"
          onError={(e) => {
            // Fallback: hide image if not found
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      
      

      {/* Position Slots */}
      <div className="relative w-full h-full">
        {formationLayout.positions.map((position) => {
          const player = assignments[position.id];
          const isGK = isGoalkeeper(position.id);

          return (
            <TooltipProvider key={position.id}>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSlotClick(position.id)}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                    }}
                  >
                    {player ? (
                      // Player marker with position and rating
                      <div className="relative flex flex-col items-center gap-0.5">
                        <div
                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-white font-bold text-sm shadow-lg
                            ${isGK 
                              ? "bg-gradient-to-b from-green-700 to-green-200 border-green-200" 
                              : "bg-gradient-to-b from-green-500 to-white border-white"
                            }`}
                        >
                          {getJerseyNumber(player)}
                        </div>
                        <div className="text-[10px] font-bold text-white bg-black/70 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {getPositionAbbr(player.position)} | ⭐{Math.round(player.currentAbility / 10)}
                        </div>
                      </div>
                    ) : (
                      // Empty slot
                      <div className="w-7 h-7 rounded-full border-2 border-dashed border-white/60 bg-white/10 hover:bg-white/20 transition-colors" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {player ? player.name : position.role}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
