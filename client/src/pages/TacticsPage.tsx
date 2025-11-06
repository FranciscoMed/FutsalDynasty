import { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { FutsalField } from "@/components/tactics/FutsalField";
import { PlayerPool } from "@/components/tactics/PlayerPool";
import { SubstitutesBench } from "@/components/tactics/SubstitutesBench";
import { FORMATIONS, Formation } from "@/lib/formations";
import type { Player } from "@/../../shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";

// Detect if device supports touch
const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export function TacticsPage() {
  const { players } = useFutsalManager();
  
  const [formation, setFormation] = useState<Formation>("3-1");
  const [assignments, setAssignments] = useState<Record<string, Player | null>>({});
  const [substitutes, setSubstitutes] = useState<(Player | null)[]>([null, null, null, null, null]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [pendingSubIndex, setPendingSubIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load tactics from backend on mount
  useEffect(() => {
    const loadTactics = async () => {
      try {
        const response = await fetch("/api/tactics");
        if (!response.ok) throw new Error("Failed to load tactics");
        
        const data = await response.json();
        
        if (data.formation) {
          setFormation(data.formation as Formation);
        }
        
        if (data.assignments) {
          // Convert player IDs to Player objects
          const loadedAssignments: Record<string, Player | null> = {};
          Object.entries(data.assignments).forEach(([slotId, playerId]) => {
            if (playerId) {
              const player = players.find(p => p.id === playerId);
              loadedAssignments[slotId] = player || null;
            } else {
              loadedAssignments[slotId] = null;
            }
          });
          setAssignments(loadedAssignments);
        }
        
        if (data.substitutes) {
          // Convert player IDs to Player objects
          const loadedSubs = data.substitutes.map((playerId: number | null) => {
            if (playerId) {
              return players.find(p => p.id === playerId) || null;
            }
            return null;
          });
          setSubstitutes(loadedSubs);
        }
      } catch (error) {
        console.error("Failed to load tactics:", error);
        toast.error("Failed to load saved tactics");
      } finally {
        setIsLoading(false);
      }
    };

    if (players.length > 0) {
      loadTactics();
    }
  }, [players]);

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

  // Handle player drop on field
  const handlePlayerDrop = (player: Player, slotId: string) => {
    // Remove player from previous assignments
    const newAssignments = { ...assignments };
    const newSubstitutes = [...substitutes];

    // Remove from field
    Object.keys(newAssignments).forEach(key => {
      if (newAssignments[key]?.id === player.id) {
        newAssignments[key] = null;
      }
    });

    // Remove from bench
    const subIndex = newSubstitutes.findIndex(p => p?.id === player.id);
    if (subIndex !== -1) {
      newSubstitutes[subIndex] = null;
    }

    // Assign to new slot
    newAssignments[slotId] = player;

    setAssignments(newAssignments);
    setSubstitutes(newSubstitutes);
    setSelectedPlayer(null);
    setPendingSlotId(null);

    toast.success(`${player.name} assigned to ${slotId}`);
  };

  // Handle player drop on bench
  const handleSubstituteDrop = (player: Player, index: number) => {
    // Remove player from previous assignments
    const newAssignments = { ...assignments };
    const newSubstitutes = [...substitutes];

    // Remove from field
    Object.keys(newAssignments).forEach(key => {
      if (newAssignments[key]?.id === player.id) {
        newAssignments[key] = null;
      }
    });

    // Remove from bench
    const subIndex = newSubstitutes.findIndex(p => p?.id === player.id);
    if (subIndex !== -1) {
      newSubstitutes[subIndex] = null;
    }

    // Assign to bench slot
    newSubstitutes[index] = player;

    setAssignments(newAssignments);
    setSubstitutes(newSubstitutes);
    setSelectedPlayer(null);
    setPendingSubIndex(null);

    toast.success(`${player.name} added to bench`);
  };

  // Handle slot click (for mobile/click-to-assign)
  const handleSlotClick = (slotId: string) => {
    const currentPlayer = assignments[slotId];
    
    if (currentPlayer) {
      // Remove player from slot
      const newAssignments = { ...assignments };
      newAssignments[slotId] = null;
      setAssignments(newAssignments);
      toast.success(`${currentPlayer.name} removed from field`);
    } else if (selectedPlayer) {
      // Assign selected player to slot
      handlePlayerDrop(selectedPlayer, slotId);
    } else {
      // Mark slot as pending for next player click
      setPendingSlotId(slotId);
      setPendingSubIndex(null);
      toast.info("Click a player from the pool to assign to this position");
    }
  };

  // Handle substitute slot click
  const handleSubSlotClick = (index: number) => {
    const currentPlayer = substitutes[index];
    
    if (currentPlayer) {
      // Remove player from bench
      const newSubstitutes = [...substitutes];
      newSubstitutes[index] = null;
      setSubstitutes(newSubstitutes);
      toast.success(`${currentPlayer.name} removed from bench`);
    } else if (selectedPlayer) {
      // Assign selected player to bench
      handleSubstituteDrop(selectedPlayer, index);
    } else {
      // Mark slot as pending
      setPendingSubIndex(index);
      setPendingSlotId(null);
      toast.info("Click a player from the pool to assign as substitute");
    }
  };

  // Handle player click from pool
  const handlePlayerClick = (player: Player) => {
    if (pendingSlotId) {
      handlePlayerDrop(player, pendingSlotId);
    } else if (pendingSubIndex !== null) {
      handleSubstituteDrop(player, pendingSubIndex);
    } else {
      setSelectedPlayer(player);
      toast.info("Click an empty position or bench slot to assign");
    }
  };

  // Reset all assignments
  const handleReset = () => {
    const newAssignments: Record<string, Player | null> = {};
    FORMATIONS[formation].positions.forEach(pos => {
      newAssignments[pos.id] = null;
    });
    setAssignments(newAssignments);
    setSubstitutes([null, null, null, null, null]);
    setSelectedPlayer(null);
    setPendingSlotId(null);
    setPendingSubIndex(null);
    toast.success("All assignments cleared");
  };

  // Save tactics
  const handleSave = async () => {
    // Validate lineup
    const filledPositions = Object.values(assignments).filter(p => p !== null).length;
    
    if (filledPositions < 5) {
      toast.error("You must assign all 5 field positions (including goalkeeper)");
      return;
    }

    setIsSaving(true);
    
    try {
      // Convert Player objects to player IDs for backend
      const assignmentsData: Record<string, number | null> = {};
      Object.entries(assignments).forEach(([slotId, player]) => {
        assignmentsData[slotId] = player ? player.id : null;
      });

      const substitutesData = substitutes.map(player => player ? player.id : null);

      const response = await fetch("/api/tactics/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formation,
          assignments: assignmentsData,
          substitutes: substitutesData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save tactics");
      }

      const data = await response.json();
      toast.success(`Tactics saved! Formation: ${formation}, ${filledPositions} players assigned`);
    } catch (error) {
      console.error("Failed to save tactics:", error);
      toast.error("Failed to save tactics. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Validation
  const filledPositions = Object.values(assignments).filter(p => p !== null).length;
  const isValid = filledPositions === 5;

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Tactics Dashboard
          </h1>
          <p className="text-muted-foreground">Loading tactics...</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Tactics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Set your team formation and assign players to positions
          </p>
        </div>

        {/* Formation & Controls Card */}
        <Card>
          <CardHeader>
            <CardTitle>Formation & Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Select value={formation} onValueChange={(value) => setFormation(value as Formation)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4-0">4-0</SelectItem>
                    <SelectItem value="3-1">3-1</SelectItem>
                    <SelectItem value="2-2">2-2</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" disabled>
                  <Settings className="w-4 h-4 mr-2" />
                  Instructions
                  <Badge variant="secondary" className="ml-2 bg-accent text-white">TBI</Badge>
                </Button>
              </div>

              <div className="flex-1" />

              <Button variant="outline" onClick={handleReset} disabled={isLoading}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>

              <Button onClick={handleSave} disabled={!isValid || isSaving || isLoading}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Tactics"}
              </Button>
            </div>

            {/* Validation status */}
            <div className="mt-4">
              {isValid ? (
                <div className="flex items-center gap-2 text-success text-sm">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span>Lineup complete • {filledPositions}/5 positions filled</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span>Incomplete lineup • {filledPositions}/5 positions filled</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Field & Player Pool Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Field (2 columns on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Futsal Field</CardTitle>
              </CardHeader>
              <CardContent>
                <FutsalField
                  formation={FORMATIONS[formation]}
                  assignments={assignments}
                  onPlayerDrop={handlePlayerDrop}
                  onSlotClick={handleSlotClick}
                />
              </CardContent>
            </Card>

            {/* Substitutes Bench */}
            <SubstitutesBench
              substitutes={substitutes}
              onPlayerDrop={handleSubstituteDrop}
              onSlotClick={handleSubSlotClick}
            />
          </div>

          {/* Player Pool (1 column on large screens) */}
          <div className="lg:col-span-1">
            <PlayerPool
              players={players}
              assignments={assignments}
              substitutes={substitutes}
              onPlayerClick={handlePlayerClick}
            />
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
