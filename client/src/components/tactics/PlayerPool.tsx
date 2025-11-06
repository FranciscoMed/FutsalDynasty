import { PlayerPoolCard } from "./PlayerPoolCard";
import type { Player } from "@/../../shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlayerPoolProps {
  players: Player[];
  assignments: Record<string, Player | null>;
  substitutes: (Player | null)[];
  onPlayerClick: (player: Player) => void;
}

export function PlayerPool({ 
  players, 
  assignments, 
  substitutes,
  onPlayerClick 
}: PlayerPoolProps) {
  // Get assigned player IDs
  const assignedFieldIds = new Set(
    Object.values(assignments).filter(p => p !== null).map(p => p!.id)
  );
  const assignedBenchIds = new Set(
    substitutes.filter(p => p !== null).map(p => p!.id)
  );

  // Calculate available count
  const availableCount = players.filter(
    p => !assignedFieldIds.has(p.id) && !assignedBenchIds.has(p.id)
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Player Pool</span>
          <span className="text-sm font-normal text-muted-foreground">
            {availableCount} available
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-2">
            {players.map((player) => {
              const isOnField = assignedFieldIds.has(player.id);
              const isOnBench = assignedBenchIds.has(player.id);
              const isAssigned = isOnField || isOnBench;
              
              return (
                <PlayerPoolCard
                  key={player.id}
                  player={player}
                  isAssigned={isAssigned}
                  assignmentType={isOnField ? "field" : isOnBench ? "bench" : undefined}
                  onClick={() => !isAssigned && onPlayerClick(player)}
                />
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
