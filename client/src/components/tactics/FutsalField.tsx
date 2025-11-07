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
    <div className="w-[300px] h-[450px] mx-auto">
      <div 
        className="
          relative w-full h-full
          rounded-lg
          border-4 border-gray-800
          shadow-2xl
          overflow-hidden
        "
        style={{
          background: 'linear-gradient(to bottom, #16a34a 0%, #22c55e 50%, #16a34a 100%)',
        }}
      >
        {/* Field Background Image */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <img
            src="/fields/futsal-field.svg"
            alt="Futsal field"
            className="w-full h-full object-cover opacity-90"
            onError={(e) => {
              // Fallback if image doesn't load - field will still show with green background
              console.log('Field image not found, using solid background');
            }}
          />
        </div>

        {/* Position slots */}
        <div className="relative z-10 w-full h-full">
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
    </div>
  );
}
