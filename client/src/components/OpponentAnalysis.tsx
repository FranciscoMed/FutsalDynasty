import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Users } from "lucide-react";

interface TopPlayer {
  id: number;
  name: string;
  position: string;
  rating: number;
}

interface OpponentInfo {
  team: {
    id: number;
    name: string;
    reputation: number;
  };
  rating: number;
  form: string[];
  topPlayers: TopPlayer[];
}

interface OpponentAnalysisProps {
  opponent: OpponentInfo;
}

export function OpponentAnalysis({ opponent }: OpponentAnalysisProps) {
  const getFormBadgeVariant = (result: string): "default" | "secondary" | "destructive" => {
    if (result === "W") return "default";
    if (result === "D") return "secondary";
    return "destructive";
  };

  const getFormColor = (result: string) => {
    if (result === "W") return "text-green-600";
    if (result === "D") return "text-yellow-600";
    return "text-red-600";
  };

  // Calculate form strength (W=3, D=1, L=0)
  const formStrength = opponent.form.reduce((sum, result) => {
    if (result === "W") return sum + 3;
    if (result === "D") return sum + 1;
    return sum;
  }, 0);
  const maxStrength = opponent.form.length * 3;
  const formPercentage = maxStrength > 0 ? (formStrength / maxStrength) * 100 : 0;

  const getStrengthColor = () => {
    if (formPercentage >= 70) return "text-red-600";
    if (formPercentage >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  const getStrengthLabel = () => {
    if (formPercentage >= 70) return "Excellent Form";
    if (formPercentage >= 40) return "Good Form";
    return "Poor Form";
  };

  return (
    <div className="space-y-4">
      {/* Team Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-[#2D6A4F]" />
            Opponent Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-[#1B4332]">{opponent.team.name}</h3>
              <p className="text-sm text-muted-foreground">Reputation: {opponent.team.reputation}/100</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-[#2D6A4F]">{opponent.rating}</div>
              <p className="text-sm text-muted-foreground">Team Rating</p>
            </div>
          </div>

          {/* Reputation Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Reputation Level</span>
              <span>{opponent.team.reputation}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#2D6A4F] transition-all duration-300"
                style={{ width: `${opponent.team.reputation}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-[#2D6A4F]" />
            Recent Form
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {opponent.form.length > 0 ? (
                opponent.form.map((result, idx) => (
                  <Badge
                    key={idx}
                    variant={getFormBadgeVariant(result)}
                    className="w-10 h-10 flex items-center justify-center text-base font-bold"
                  >
                    {result}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent matches</p>
              )}
            </div>
            <div className="text-right">
              <div className={`text-xl font-bold ${getStrengthColor()}`}>
                {getStrengthLabel()}
              </div>
              <p className="text-xs text-muted-foreground">
                {opponent.form.filter(r => r === "W").length}W - 
                {opponent.form.filter(r => r === "D").length}D - 
                {opponent.form.filter(r => r === "L").length}L
              </p>
            </div>
          </div>

          {/* Form Strength Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Form Strength</span>
              <span>{Math.round(formPercentage)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  formPercentage >= 70 ? "bg-red-600" :
                  formPercentage >= 40 ? "bg-yellow-600" : "bg-green-600"
                }`}
                style={{ width: `${formPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-[#2D6A4F]" />
            Key Players to Watch
          </CardTitle>
        </CardHeader>
        <CardContent>
          {opponent.topPlayers.length > 0 ? (
            <div className="space-y-3">
              {opponent.topPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1B4332]">{player.name}</p>
                      <p className="text-xs text-muted-foreground">{player.position}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#2D6A4F]">{player.rating}</div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No key player information available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tactical Advice */}
      <Card className="border-[#2D6A4F] bg-[#2D6A4F]/5">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h4 className="font-semibold text-[#1B4332]">💡 Tactical Suggestions</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {formPercentage >= 70 && (
                <li>• Opponent in excellent form - consider defensive tactics</li>
              )}
              {opponent.rating >= 15 && (
                <li>• Strong opponent - focus on counter-attacking play</li>
              )}
              {opponent.rating < 12 && (
                <li>• Weaker opponent - attacking tactics recommended</li>
              )}
              {opponent.topPlayers.length > 0 && (
                <li>• Mark {opponent.topPlayers[0].name} closely</li>
              )}
              {formPercentage < 40 && (
                <li>• Opponent struggling for form - press high and exploit weaknesses</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
