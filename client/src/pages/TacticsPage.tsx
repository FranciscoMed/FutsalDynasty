import { useEffect, useState } from "react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Formation, type TacticalPreset, internalToDisplay } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TacticsPage() {
  const { players, playerTeam, updatePlayerTeam, loadGameData } = useFutsalManager();
  const [formation, setFormation] = useState<Formation>("2-2");
  const [tacticalPreset, setTacticalPreset] = useState<TacticalPreset>("Balanced");
  const [startingLineup, setStartingLineup] = useState<number[]>([]);

  useEffect(() => {
    loadGameData();
  }, []);

  useEffect(() => {
    if (playerTeam) {
      setFormation(playerTeam.formation);
      setTacticalPreset(playerTeam.tacticalPreset);
      setStartingLineup(playerTeam.startingLineup);
    }
  }, [playerTeam]);

  const formations: Formation[] = ["2-2", "3-1", "4-0", "1-2-1", "1-3", "2-1-1"];
  const presets: TacticalPreset[] = ["Defensive", "Balanced", "Attacking"];

  const handleSave = async () => {
    await updatePlayerTeam({
      formation,
      tacticalPreset,
      startingLineup,
    });
    alert("Tactics saved successfully!");
  };

  const togglePlayerInLineup = (playerId: number) => {
    if (startingLineup.includes(playerId)) {
      setStartingLineup(startingLineup.filter(id => id !== playerId));
    } else {
      if (startingLineup.length < 5) {
        setStartingLineup([...startingLineup, playerId]);
      }
    }
  };

  const availablePlayers = players.filter(
    p => !p.injured && !p.suspended && p.fitness >= 70
  );

  const goalkeeper = availablePlayers.find(p => p.position === "Goalkeeper");
  const outfieldPlayers = availablePlayers.filter(p => p.position !== "Goalkeeper");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Tactics</h1>
        <p className="text-muted-foreground">Set up your formation and tactical approach</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Formation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {formations.map((f) => (
                <Button
                  key={f}
                  variant={formation === f ? "default" : "outline"}
                  onClick={() => setFormation(f)}
                >
                  {f}
                </Button>
              ))}
            </div>

            <div className="mt-6 p-6 bg-primary/5 rounded-lg border-2 border-primary/20">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Selected Formation</p>
                <p className="text-3xl font-bold text-primary">{formation}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tactical Preset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {presets.map((preset) => (
                <Button
                  key={preset}
                  variant={tacticalPreset === preset ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setTacticalPreset(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Attacking Intent</span>
                <span className="font-medium">
                  {tacticalPreset === "Attacking" ? "High" : tacticalPreset === "Balanced" ? "Medium" : "Low"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Defensive Solidity</span>
                <span className="font-medium">
                  {tacticalPreset === "Defensive" ? "High" : tacticalPreset === "Balanced" ? "Medium" : "Low"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Starting Lineup ({startingLineup.length}/5)</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="goalkeeper">
            <TabsList>
              <TabsTrigger value="goalkeeper">Goalkeeper</TabsTrigger>
              <TabsTrigger value="outfield">Outfield Players</TabsTrigger>
            </TabsList>

            <TabsContent value="goalkeeper" className="space-y-2">
              {goalkeeper ? (
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    startingLineup.includes(goalkeeper.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => togglePlayerInLineup(goalkeeper.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{goalkeeper.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {goalkeeper.position}
                        </Badge>
                        <span className="text-sm">
                          Age: {goalkeeper.age}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {internalToDisplay(goalkeeper.currentAbility)}
                      </p>
                      <p className="text-xs">Overall</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No available goalkeeper</p>
              )}
            </TabsContent>

            <TabsContent value="outfield" className="space-y-2">
              {outfieldPlayers.map((player) => (
                <div
                  key={player.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    startingLineup.includes(player.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => togglePlayerInLineup(player.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{player.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {player.position}
                        </Badge>
                        <span className="text-sm">
                          Age: {player.age}
                        </span>
                        <span className="text-sm">
                          Form: {player.form}/10
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {internalToDisplay(player.currentAbility)}
                      </p>
                      <p className="text-xs">Overall</p>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setStartingLineup([])}>
          Clear Lineup
        </Button>
        <Button onClick={handleSave} disabled={startingLineup.length !== 5}>
          Save Tactics
        </Button>
      </div>
    </div>
  );
}
