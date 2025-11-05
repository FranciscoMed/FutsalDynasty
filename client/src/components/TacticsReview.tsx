import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Shield, Users } from "lucide-react";
import type { Player, Formation, TacticalPreset } from "@shared/schema";

interface TacticsReviewProps {
  currentFormation: Formation;
  currentTacticalPreset: TacticalPreset;
  startingLineup: number[];
  substitutes: number[];
  squad: Player[];
  onFormationChange: (formation: Formation) => void;
  onTacticalPresetChange: (preset: TacticalPreset) => void;
  onLineupChange: (lineup: number[]) => void;
}

export function TacticsReview({
  currentFormation,
  currentTacticalPreset,
  startingLineup,
  substitutes,
  squad,
  onFormationChange,
  onTacticalPresetChange,
  onLineupChange,
}: TacticsReviewProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);

  // Get player details
  const getPlayer = (playerId: number) => squad.find(p => p.id === playerId);
  
  const starters = startingLineup.map(id => getPlayer(id)).filter(Boolean) as Player[];
  const bench = substitutes.map(id => getPlayer(id)).filter(Boolean) as Player[];

  // Validation
  const hasGoalkeeper = starters.some(p => p.position === "Goalkeeper");
  const hasCorrectCount = starters.length === 5;
  const isValid = hasGoalkeeper && hasCorrectCount;

  // Get player rating display (0-20 scale)
  const getPlayerRating = (player: Player) => {
    return Math.round(player.currentAbility / 10);
  };

  // Get position color
  const getPositionColor = (position: string) => {
    switch (position) {
      case "Goalkeeper": return "bg-yellow-500";
      case "Defender": return "bg-blue-500";
      case "Winger": return "bg-green-500";
      case "Pivot": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  // Get tactical preset color
  const getTacticalColor = (preset: TacticalPreset) => {
    switch (preset) {
      case "Attacking": return "text-red-600";
      case "Balanced": return "text-blue-600";
      case "Defensive": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  // Formation layouts (simplified visual representation)
  const getFormationLayout = (formation: Formation) => {
    switch (formation) {
      case "2-2":
        return { defenders: 2, midfielders: 2, forwards: 0 };
      case "3-1":
        return { defenders: 3, midfielders: 1, forwards: 0 };
      case "4-0":
        return { defenders: 4, midfielders: 0, forwards: 0 };
      case "1-2-1":
        return { defenders: 1, midfielders: 2, forwards: 1 };
      case "1-3":
        return { defenders: 1, midfielders: 3, forwards: 0 };
      case "2-1-1":
        return { defenders: 2, midfielders: 1, forwards: 1 };
      default:
        return { defenders: 2, midfielders: 2, forwards: 0 };
    }
  };

  const formationLayout = getFormationLayout(currentFormation);

  return (
    <div className="space-y-4">
      {/* Validation Alert */}
      {!isValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {!hasCorrectCount && `You need exactly 5 players in starting lineup (currently ${starters.length}). `}
            {!hasGoalkeeper && "Starting lineup must include a Goalkeeper."}
          </AlertDescription>
        </Alert>
      )}

      {/* Formation & Tactics Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Formation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={currentFormation} onValueChange={onFormationChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2-2">2-2 (Balanced)</SelectItem>
                <SelectItem value="3-1">3-1 (Defensive)</SelectItem>
                <SelectItem value="4-0">4-0 (Very Defensive)</SelectItem>
                <SelectItem value="1-2-1">1-2-1 (Balanced)</SelectItem>
                <SelectItem value="1-3">1-3 (Attacking)</SelectItem>
                <SelectItem value="2-1-1">2-1-1 (Attacking)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              {formationLayout.defenders}D - {formationLayout.midfielders}M
              {formationLayout.forwards > 0 && ` - ${formationLayout.forwards}F`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Tactical Style
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={currentTacticalPreset} onValueChange={onTacticalPresetChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Defensive">Defensive</SelectItem>
                <SelectItem value="Balanced">Balanced</SelectItem>
                <SelectItem value="Attacking">Attacking</SelectItem>
              </SelectContent>
            </Select>
            <p className={`text-xs font-semibold mt-2 ${getTacticalColor(currentTacticalPreset)}`}>
              {currentTacticalPreset === "Attacking" && "High pressing, more attacking play"}
              {currentTacticalPreset === "Balanced" && "Balanced approach in attack and defense"}
              {currentTacticalPreset === "Defensive" && "Compact defense, counter-attack focus"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Starting Lineup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Starting Lineup ({starters.length}/5)</CardTitle>
        </CardHeader>
        <CardContent>
          {starters.length > 0 ? (
            <div className="space-y-2">
              {starters.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedPlayer === player.id 
                      ? "border-[#2D6A4F] bg-[#2D6A4F]/10" 
                      : "border-border hover:bg-muted"
                  }`}
                  onClick={() => setSelectedPlayer(player.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${getPositionColor(player.position)} text-white flex items-center justify-center text-xs font-bold`}>
                      {player.position.substring(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{player.name}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{player.position}</span>
                        <span>•</span>
                        <span>Age: {player.age}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xl font-bold text-[#2D6A4F]">
                        {getPlayerRating(player)}
                      </div>
                      <p className="text-xs text-muted-foreground">Rating</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant={player.fitness >= 80 ? "default" : "destructive"} className="text-xs">
                        Fitness: {player.fitness}%
                      </Badge>
                      {player.injured && (
                        <Badge variant="destructive" className="text-xs">Injured</Badge>
                      )}
                      {player.suspended && (
                        <Badge variant="destructive" className="text-xs">Suspended</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No players selected for starting lineup
            </p>
          )}
        </CardContent>
      </Card>

      {/* Substitutes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Substitutes ({bench.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {bench.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {bench.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${getPositionColor(player.position)} text-white flex items-center justify-center text-xs font-bold`}>
                      {player.position.substring(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-xs">{player.name}</p>
                      <p className="text-xs text-muted-foreground">{player.position}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#2D6A4F]">
                      {getPlayerRating(player)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No substitute players
            </p>
          )}
        </CardContent>
      </Card>

      {/* Team Stats Summary */}
      <Card className="border-[#2D6A4F] bg-[#2D6A4F]/5">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#1B4332]">
                {starters.length > 0 
                  ? Math.round(starters.reduce((sum, p) => sum + getPlayerRating(p), 0) / starters.length)
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#1B4332]">
                {starters.length > 0
                  ? Math.round(starters.reduce((sum, p) => sum + p.fitness, 0) / starters.length)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Avg Fitness</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#1B4332]">
                {starters.reduce((sum, p) => sum + p.age, 0) / (starters.length || 1) | 0}
              </div>
              <p className="text-xs text-muted-foreground">Avg Age</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#1B4332]">
                {starters.filter(p => p.fitness >= 80 && !p.injured && !p.suspended).length}
              </div>
              <p className="text-xs text-muted-foreground">Fit Players</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
