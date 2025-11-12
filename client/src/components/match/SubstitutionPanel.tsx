import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface Player {
  player: {
    id: number;
    name: string;
    position: string;
    energy: number;
    currentAbility?: number;
  };
  performance: {
    rating: number;
  };
}

interface SubstitutionPanelProps {
  lineup: Player[];
  allPlayers: Player[];
  suspendedPlayerIds: number[];
  onSubstitute: (outPlayerId: number, inPlayerId: number) => void;
}

export function SubstitutionPanel({ lineup, allPlayers, suspendedPlayerIds, onSubstitute }: SubstitutionPanelProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  
  // Get players on court (first 5 in lineup)
  const onCourt = lineup.slice(0, 5);
  
  // Get bench players (not in first 5 of lineup)
  const onCourtIds = onCourt.map(p => p.player.id);
  const benchPlayers = allPlayers.filter(p => !onCourtIds.includes(p.player.id));

  const handleSubClick = (benchPlayer: Player) => {
    if (!selectedPlayer) return;
    
    // Check if player is suspended
    if (suspendedPlayerIds.includes(benchPlayer.player.id)) {
      return; // Cannot substitute suspended players
    }
    
    onSubstitute(selectedPlayer.player.id, benchPlayer.player.id);
    setSelectedPlayer(null);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Select a player on court, then click a bench player to substitute
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-6">
        {/* On Court */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">On Court (5)</h3>
          <div className="space-y-2">
            {onCourt.map(player => (
              <Button
                key={player.player.id}
                variant={selectedPlayer?.player.id === player.player.id ? "default" : "outline"}
                className="w-full justify-start h-auto p-3"
                onClick={() => setSelectedPlayer(player)}
              >
                <div className="flex items-center gap-3 w-full">
                  <Badge className="shrink-0">{player.player.position}</Badge>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-semibold truncate">{player.player.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>⭐ {player.performance.rating.toFixed(1)}</span>
                      {player.player.currentAbility && (
                        <span className="font-semibold">✨ {Math.round(player.player.currentAbility / 10)}</span>
                      )}
                      <span className={`font-semibold ${
                        player.player.energy < 30 ? 'text-red-600' :
                        player.player.energy < 60 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        ⚡ {Math.round(player.player.energy)}%
                      </span>
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Bench */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">
            Bench ({benchPlayers.length})
          </h3>
          <div className="space-y-2">
            {benchPlayers.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No players available on bench
              </div>
            ) : (
              benchPlayers.map(player => {
                const isSuspended = suspendedPlayerIds.includes(player.player.id);
                return (
                  <Button
                    key={player.player.id}
                    variant="outline"
                    className={`w-full justify-start h-auto p-3 ${isSuspended ? 'opacity-50 cursor-not-allowed border-red-500' : ''}`}
                    onClick={() => handleSubClick(player)}
                    disabled={!selectedPlayer || isSuspended}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Badge variant={isSuspended ? "destructive" : "secondary"} className="shrink-0">
                        {player.player.position}
                      </Badge>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-semibold truncate flex items-center gap-2">
                          {player.player.name}
                          {isSuspended && <span className="text-red-500 text-xs">🟥 SUSPENDED</span>}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>⭐ {player.performance.rating.toFixed(1)}</span>
                          {player.player.currentAbility && (
                            <span className="font-semibold">CA: {player.player.currentAbility}</span>
                          )}
                          {!isSuspended && (
                            <span className="font-semibold text-green-600">
                              ⚡ {Math.round(player.player.energy)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
