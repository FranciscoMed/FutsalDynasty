import { useEffect, useState } from "react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { type Player, type TrainingIntensity, internalToDisplay } from "@shared/schema";
import { GraduationCap, TrendingUp, Zap } from "lucide-react";

export function TrainingPage() {
  const { players, updatePlayer, loadGameData, loading, initialized } = useFutsalManager();
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);

  useEffect(() => {
    if (initialized) {
      loadGameData();
    }
  }, [initialized]);

  const handleTrainingChange = async (
    playerId: number,
    field: 'primary' | 'secondary' | 'intensity',
    value: string
  ) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const updatedFocus = {
      ...player.trainingFocus,
      [field]: value,
    };

    await updatePlayer(playerId, { trainingFocus: updatedFocus });
    setEditingPlayer(null);
  };

  const focusAreas = ["technical", "physical", "defensive", "mental"];
  const intensities: TrainingIntensity[] = ["low", "medium", "high"];

  const getPotentialStars = (potential: number): string => {
    const display = internalToDisplay(potential);
    if (display >= 18) return "⭐⭐⭐⭐⭐";
    if (display >= 16) return "⭐⭐⭐⭐";
    if (display >= 14) return "⭐⭐⭐";
    if (display >= 12) return "⭐⭐";
    return "⭐";
  };

  const getAgeGrowthInfo = (age: number): { speed: string; color: string } => {
    if (age <= 21) return { speed: "Fast", color: "text-success" };
    if (age <= 25) return { speed: "Moderate", color: "text-yellow-600" };
    if (age <= 29) return { speed: "Slow", color: "text-orange-600" };
    if (age <= 32) return { speed: "Minimal", color: "text-red-600" };
    return { speed: "Declining", color: "text-destructive" };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Training</h1>
        <p className="text-muted-foreground">
          Set monthly training plans for your players
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Facility</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Level 3</div>
            <p className="text-xs text-muted-foreground">
              Good development potential
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Report</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23 days</div>
            <p className="text-xs text-muted-foreground">
              End of September
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Focus</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{players.length}</div>
            <p className="text-xs text-muted-foreground">
              Players in training
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Player Development Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {players.map((player) => {
              const growthInfo = getAgeGrowthInfo(player.age);
              const isEditing = editingPlayer === player.id;

              return (
                <div key={player.id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-3">
                      <p className="font-medium">{player.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {player.position}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {player.age} yrs
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Potential: {getPotentialStars(player.potential)}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Overall</p>
                      <p className="text-2xl font-bold text-primary">
                        {internalToDisplay(player.currentAbility)}
                      </p>
                      <p className={`text-xs ${growthInfo.color}`}>
                        {growthInfo.speed} growth
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground mb-1">Primary Focus</p>
                      {isEditing ? (
                        <Select
                          value={player.trainingFocus.primary}
                          onValueChange={(value) => handleTrainingChange(player.id, 'primary', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {focusAreas.map(area => (
                              <SelectItem key={area} value={area}>
                                {area.charAt(0).toUpperCase() + area.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="default">
                          {player.trainingFocus.primary}
                        </Badge>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground mb-1">Secondary Focus</p>
                      {isEditing ? (
                        <Select
                          value={player.trainingFocus.secondary}
                          onValueChange={(value) => handleTrainingChange(player.id, 'secondary', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {focusAreas.map(area => (
                              <SelectItem key={area} value={area}>
                                {area.charAt(0).toUpperCase() + area.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">
                          {player.trainingFocus.secondary}
                        </Badge>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground mb-1">Intensity</p>
                      {isEditing ? (
                        <Select
                          value={player.trainingFocus.intensity}
                          onValueChange={(value) => handleTrainingChange(player.id, 'intensity', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {intensities.map(intensity => (
                              <SelectItem key={intensity} value={intensity}>
                                {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant={
                            player.trainingFocus.intensity === "high"
                              ? "destructive"
                              : player.trainingFocus.intensity === "medium"
                              ? "default"
                              : "outline"
                          }
                        >
                          {player.trainingFocus.intensity}
                        </Badge>
                      )}
                    </div>

                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingPlayer(isEditing ? null : player.id)}
                      >
                        {isEditing ? "Done" : "Edit"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Training Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Training Intensity Guide</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span><Badge variant="outline">Low</Badge> Low growth, minimal injury risk</span>
                </div>
                <div className="flex justify-between">
                  <span><Badge variant="default">Medium</Badge> Moderate growth, low injury risk</span>
                </div>
                <div className="flex justify-between">
                  <span><Badge variant="destructive">High</Badge> Fast growth, higher injury risk</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Age & Development</h4>
              <div className="space-y-2 text-sm">
                <p><span className="text-success">16-21:</span> Peak development years (24-40 points/month)</p>
                <p><span className="text-yellow-600">22-25:</span> Good development (16-28 points/month)</p>
                <p><span className="text-orange-600">26-29:</span> Maintenance phase (8-20 points/month)</p>
                <p><span className="text-red-600">30-32:</span> Slow decline (4-12 points/month)</p>
                <p><span className="text-destructive">33+:</span> Clear decline phase</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
