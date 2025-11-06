import type { Player } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus } from "lucide-react";

interface CompactSubstitutesBenchProps {
  substitutes: (Player | null)[];
  onSlotClick: (index: number) => void;
}

export function CompactSubstitutesBench({ substitutes, onSlotClick }: CompactSubstitutesBenchProps) {
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

  // Count filled slots
  const filledCount = substitutes.filter(s => s !== null).length;

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Substitutes</h3>
        <span className="text-xs text-muted-foreground">{filledCount}/5</span>
      </div>
      
      <div className="flex flex-col gap-3 flex-1 justify-center">
        {substitutes.map((player, index) => (
          <TooltipProvider key={index}>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSlotClick(index)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-sm transition-all
                      ${player 
                        ? "bg-gradient-to-b from-green-500 to-white border-2 border-white hover:scale-110" 
                        : "border-2 border-dashed border-muted-foreground/40 bg-muted/30 hover:bg-muted/50 hover:border-[#2D6A4F]"
                      }`}
                  >
                    {player ? (
                      getJerseyNumber(player)
                    ) : (
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  {player && (
                    <div className="text-[11px] font-semibold text-foreground bg-muted px-2 py-1 rounded whitespace-nowrap">
                      {getPositionAbbr(player.position)} | ⭐{Math.round(player.currentAbility / 10)}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-xs">
                  {player ? player.name : `Sub ${index + 1}`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}
