import { PositionSlot } from "./PositionSlot";
import type { FormationLayout } from "@/lib/formations";
import type { Player } from "@/../../shared/schema";

interface FutsalFieldProps {
  formation: FormationLayout;
  assignments: Record<string, Player | null>;
  onPlayerDrop: (player: Player, slotId: string) => void;
  onSlotClick: (slotId: string) => void;
}

export function FutsalField({ 
  formation, 
  assignments, 
  onPlayerDrop, 
  onSlotClick 
}: FutsalFieldProps) {
  return (
    <div className="w-full max-w-[420px] mx-auto">
      <div 
        className="
          relative w-full
          aspect-[2/3]
          rounded-3xl
          border-4 border-white/35
          shadow-2xl
          overflow-hidden
        "
        style={{
          backgroundImage: "url(/fields/futsal-field.svg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Position slots */}
        {formation.positions.map((slot) => (
          <PositionSlot
            key={slot.id}
            slot={slot}
            player={assignments[slot.id] || null}
            onDrop={onPlayerDrop}
            onClick={() => onSlotClick(slot.id)}
          />
        ))}
      </div>
    </div>
  );
}
