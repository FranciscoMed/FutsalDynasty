import { useState, useEffect, useRef } from "react";
import { Formation, FORMATIONS } from "@/lib/formations";
import type { Player } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { CompactFutsalField } from "./CompactFutsalField";
import { CompactSubstitutesBench } from "./CompactSubstitutesBench";
import { TacticsControls } from "./TacticsControls";
import { QuickPlayerSelector } from "./QuickPlayerSelector";

interface TacticsReviewV2Props {
  squad: Player[];
  initialFormation?: Formation;
  initialAssignments?: Record<string, number | null>;
  initialSubstitutes?: (number | null)[];
  onTacticsChange: (data: {
    formation: Formation;
    assignments: Record<string, number | null>;
    substitutes: (number | null)[];
  }) => void;
}

export function TacticsReviewV2({ 
  squad, 
  initialFormation = "3-1",
  initialAssignments = {},
  initialSubstitutes = [null, null, null, null, null],
  onTacticsChange 
}: TacticsReviewV2Props) {
  const [formation, setFormation] = useState<Formation>(initialFormation);
  const [assignments, setAssignments] = useState<Record<string, Player | null>>(() => {
    // Initialize assignments from IDs on first mount
    const playerAssignments: Record<string, Player | null> = {};
    Object.entries(initialAssignments).forEach(([slotId, playerId]) => {
      if (playerId !== null) {
        const player = squad.find(p => p.id === playerId);
        playerAssignments[slotId] = player || null;
      } else {
        playerAssignments[slotId] = null;
      }
    });
    return playerAssignments;
  });
  const [substitutes, setSubstitutes] = useState<(Player | null)[]>(() => {
    // Initialize substitutes from IDs on first mount
    return initialSubstitutes.map(id => {
      if (id !== null) {
        return squad.find(p => p.id === id) || null;
      }
      return null;
    });
  });
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedSubIndex, setSelectedSubIndex] = useState<number | null>(null);
  
  // Track if this is the first render to avoid notifying parent of initial state
  const isFirstRender = useRef(true);

  // Initialize empty assignments when formation changes
  useEffect(() => {
    const newAssignments: Record<string, Player | null> = {};
    FORMATIONS[formation].positions.forEach(pos => {
      // Preserve goalkeeper if changing formation
      if (pos.role === "Goalkeeper" && assignments["gk"]) {
        newAssignments[pos.id] = assignments["gk"];
      } else {
        newAssignments[pos.id] = assignments[pos.id] || null;
      }
    });
    setAssignments(newAssignments);
  }, [formation]);

  // Notify parent of changes (skip first render to avoid overwriting loaded data)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Convert Player objects to IDs
    const assignmentsData: Record<string, number | null> = {};
    Object.entries(assignments).forEach(([slotId, player]) => {
      assignmentsData[slotId] = player ? player.id : null;
    });
    
    const substitutesData = substitutes.map(p => p ? p.id : null);

    console.log('Notifying parent of tactics change:', { formation, assignmentsData, substitutesData });
    
    onTacticsChange({
      formation,
      assignments: assignmentsData,
      substitutes: substitutesData,
    });
  }, [formation, assignments, substitutes]);

  // Remove player from all locations
  const removePlayerFromAll = (playerId: number) => {
    // Remove from field
    const newAssignments = { ...assignments };
    Object.keys(newAssignments).forEach(slotId => {
      if (newAssignments[slotId]?.id === playerId) {
        newAssignments[slotId] = null;
      }
    });
    setAssignments(newAssignments);

    // Remove from substitutes
    const newSubs = substitutes.map(p => p?.id === playerId ? null : p);
    setSubstitutes(newSubs);
  };

  // Handle field slot click
  const handleSlotClick = (slotId: string) => {
    const currentPlayer = assignments[slotId];
    
    if (currentPlayer) {
      // Remove player from slot
      const newAssignments = { ...assignments };
      newAssignments[slotId] = null;
      setAssignments(newAssignments);
      toast.info(`${currentPlayer.name} removed from field`);
    } else {
      // Select slot for assignment
      setSelectedSlotId(slotId);
      setSelectedSubIndex(null);
      toast.info(`Click a player to assign to this position`);
    }
  };

  // Handle substitute slot click
  const handleSubSlotClick = (index: number) => {
    const currentPlayer = substitutes[index];
    
    if (currentPlayer) {
      // Remove player from bench
      const newSubs = [...substitutes];
      newSubs[index] = null;
      setSubstitutes(newSubs);
      toast.info(`${currentPlayer.name} removed from bench`);
    } else {
      // Select slot for assignment
      setSelectedSubIndex(index);
      setSelectedSlotId(null);
      toast.info(`Click a player to assign as substitute`);
    }
  };

  // Handle player click from quick selector
  const handlePlayerClick = (player: Player) => {
    if (selectedSlotId) {
      // Assign to field
      removePlayerFromAll(player.id);
      const newAssignments = { ...assignments };
      newAssignments[selectedSlotId] = player;
      setAssignments(newAssignments);
      setSelectedSlotId(null);
      toast.success(`${player.name} assigned to field`);
    } else if (selectedSubIndex !== null) {
      // Assign to bench
      removePlayerFromAll(player.id);
      const newSubs = [...substitutes];
      newSubs[selectedSubIndex] = player;
      setSubstitutes(newSubs);
      setSelectedSubIndex(null);
      toast.success(`${player.name} assigned to bench`);
    } else {
      // Auto-assign to next empty field slot
      const emptySlot = Object.entries(assignments).find(([_, p]) => p === null);
      if (emptySlot) {
        removePlayerFromAll(player.id);
        const newAssignments = { ...assignments };
        newAssignments[emptySlot[0]] = player;
        setAssignments(newAssignments);
        toast.success(`${player.name} assigned to field`);
      } else {
        // Assign to first empty bench slot
        const emptySubIndex = substitutes.findIndex(p => p === null);
        if (emptySubIndex !== -1) {
          removePlayerFromAll(player.id);
          const newSubs = [...substitutes];
          newSubs[emptySubIndex] = player;
          setSubstitutes(newSubs);
          toast.success(`${player.name} assigned to bench`);
        } else {
          toast.error("No empty slots available");
        }
      }
    }
  };

  // Quick Fill - auto-assign best players
  const handleQuickFill = () => {
    const sortedPlayers = [...squad].sort((a, b) => b.currentAbility - a.currentAbility);
    
    // Find best goalkeeper
    const goalkeeper = sortedPlayers.find(p => p.position === "Goalkeeper");
    
    // Get best outfield players
    const outfield = sortedPlayers.filter(p => p.position !== "Goalkeeper");
    
    // Assign to field
    const newAssignments: Record<string, Player | null> = {};
    const positions = FORMATIONS[formation].positions;
    
    let playerIndex = 0;
    positions.forEach(pos => {
      if (pos.role === "Goalkeeper") {
        newAssignments[pos.id] = goalkeeper || null;
      } else {
        newAssignments[pos.id] = outfield[playerIndex] || null;
        playerIndex++;
      }
    });
    
    // Assign remaining to bench
    const assigned = Object.values(newAssignments).filter(p => p !== null).map(p => p!.id);
    const remaining = sortedPlayers.filter(p => !assigned.includes(p.id));
    const newSubs: (Player | null)[] = [
      remaining[0] || null,
      remaining[1] || null,
      remaining[2] || null,
      remaining[3] || null,
      remaining[4] || null,
    ];
    
    setAssignments(newAssignments);
    setSubstitutes(newSubs);
    setSelectedSlotId(null);
    setSelectedSubIndex(null);
    toast.success("Best 5 auto-assigned!");
  };

  // Instructions placeholder
  const handleInstructionsClick = () => {
    toast.info("Tactical Instructions feature coming soon!");
  };

  // Get available players (not assigned anywhere)
  const assignedIds = [
    ...Object.values(assignments).filter(p => p !== null).map(p => p!.id),
    ...substitutes.filter(p => p !== null).map(p => p!.id),
  ];
  const availablePlayers = squad.filter(p => !assignedIds.includes(p.id));

  // Validation
  const filledPositions = Object.values(assignments).filter(p => p !== null).length;
  const hasGoalkeeper = Object.entries(assignments).some(([slotId, player]) => {
    if (!player) return false;
    const position = FORMATIONS[formation].positions.find(p => p.id === slotId);
    return position?.role === "Goalkeeper";
  });
  const isComplete = filledPositions === 5 && hasGoalkeeper;

  return (
    <div className="space-y-4">
      {/* Validation Alert */}
      {!isComplete && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {!hasGoalkeeper && "You need a Goalkeeper in the starting lineup. "}
            {filledPositions < 5 && `Assign ${5 - filledPositions} more player(s) to complete your lineup.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <TacticsControls
        formation={formation}
        onFormationChange={setFormation}
        onQuickFill={handleQuickFill}
        onInstructionsClick={handleInstructionsClick}
      />

      {/* Field | Substitutes | Available Players - All Side by Side */}
      <div className="flex gap-4">
        {/* Field */}
        <Card className="flex-shrink-0">
          <CardContent className="pt-6 pb-6">
            <CompactFutsalField
              formation={formation}
              assignments={assignments}
              onSlotClick={handleSlotClick}
            />
          </CardContent>
        </Card>

        {/* Substitutes - Vertical */}
        <Card className="flex-shrink-0 w-[200px]">
          <CardContent className="pt-6 pb-6">
            <CompactSubstitutesBench
              substitutes={substitutes}
              onSlotClick={handleSubSlotClick}
            />
          </CardContent>
        </Card>

        {/* Available Players */}
        {availablePlayers.length > 0 && (
          <div className="flex-1 min-w-0">
            <QuickPlayerSelector
              availablePlayers={availablePlayers}
              onPlayerClick={handlePlayerClick}
            />
          </div>
        )}
      </div>

      {/* Selection hint */}
      {(selectedSlotId || selectedSubIndex !== null) && (
        <Alert className="border-[#2D6A4F] bg-[#2D6A4F]/10">
          <AlertDescription className="text-[#1B4332] font-semibold">
            {selectedSlotId && "📍 Click a player below to assign to the selected field position"}
            {selectedSubIndex !== null && "📍 Click a player below to assign as substitute"}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
