import { useState, useEffect } from "react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { internalToDisplay, type Player } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SquadPage() {
  const { players, loadGameData } = useFutsalManager();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [filterPosition, setFilterPosition] = useState<string>("all");

  useEffect(() => {
    loadGameData();
  }, []);

  const filteredPlayers = filterPosition === "all" 
    ? players 
    : players.filter(p => p.position === filterPosition);

  const positions = ["all", "Goalkeeper", "Defender", "Winger", "Pivot"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Squad</h1>
        <p className="text-muted-foreground">Manage your players and view their stats</p>
      </div>

      <div className="flex gap-2">
        {positions.map(pos => (
          <Button
            key={pos}
            variant={filterPosition === pos ? "default" : "outline"}
            onClick={() => setFilterPosition(pos)}
            size="sm"
          >
            {pos === "all" ? "All Players" : pos}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Player Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead>Form</TableHead>
                <TableHead>Fitness</TableHead>
                <TableHead>Morale</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{player.position}</Badge>
                  </TableCell>
                  <TableCell>{player.age}</TableCell>
                  <TableCell>
                    <span className="font-bold text-primary">
                      {internalToDisplay(player.currentAbility)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={player.form * 10} className="w-16 h-2" />
                      <span className="text-sm">{player.form}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={player.fitness} className="w-16 h-2" />
                      <span className="text-sm">{player.fitness}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={player.morale * 10} className="w-16 h-2" />
                      <span className="text-sm">{player.morale}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {player.injured ? (
                      <Badge variant="destructive">Injured</Badge>
                    ) : player.suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge className="bg-success text-white">Available</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPlayer(player)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPlayer?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedPlayer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Position</p>
                  <p className="font-medium">{selectedPlayer.position}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Age</p>
                  <p className="font-medium">{selectedPlayer.age} years</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nationality</p>
                  <p className="font-medium">{selectedPlayer.nationality}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overall Rating</p>
                  <p className="font-medium text-primary text-xl">
                    {internalToDisplay(selectedPlayer.currentAbility)}
                  </p>
                </div>
              </div>

              <Tabs defaultValue="technical">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                  <TabsTrigger value="physical">Physical</TabsTrigger>
                  <TabsTrigger value="defensive">Defensive</TabsTrigger>
                  <TabsTrigger value="mental">Mental</TabsTrigger>
                </TabsList>

                <TabsContent value="technical" className="space-y-3">
                  {Object.entries({
                    "Shooting": selectedPlayer.attributes.shooting,
                    "Passing": selectedPlayer.attributes.passing,
                    "Dribbling": selectedPlayer.attributes.dribbling,
                    "Ball Control": selectedPlayer.attributes.ballControl,
                    "First Touch": selectedPlayer.attributes.firstTouch,
                  }).map(([name, value]) => (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{name}</span>
                        <span className="font-medium">{internalToDisplay(value)}</span>
                      </div>
                      <Progress value={(value / 200) * 100} />
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="physical" className="space-y-3">
                  {Object.entries({
                    "Pace": selectedPlayer.attributes.pace,
                    "Stamina": selectedPlayer.attributes.stamina,
                    "Strength": selectedPlayer.attributes.strength,
                    "Agility": selectedPlayer.attributes.agility,
                  }).map(([name, value]) => (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{name}</span>
                        <span className="font-medium">{internalToDisplay(value)}</span>
                      </div>
                      <Progress value={(value / 200) * 100} />
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="defensive" className="space-y-3">
                  {Object.entries({
                    "Tackling": selectedPlayer.attributes.tackling,
                    "Positioning": selectedPlayer.attributes.positioning,
                    "Marking": selectedPlayer.attributes.marking,
                    "Interceptions": selectedPlayer.attributes.interceptions,
                  }).map(([name, value]) => (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{name}</span>
                        <span className="font-medium">{internalToDisplay(value)}</span>
                      </div>
                      <Progress value={(value / 200) * 100} />
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="mental" className="space-y-3">
                  {Object.entries({
                    "Vision": selectedPlayer.attributes.vision,
                    "Decision Making": selectedPlayer.attributes.decisionMaking,
                    "Composure": selectedPlayer.attributes.composure,
                    "Work Rate": selectedPlayer.attributes.workRate,
                  }).map(([name, value]) => (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{name}</span>
                        <span className="font-medium">{internalToDisplay(value)}</span>
                      </div>
                      <Progress value={(value / 200) * 100} />
                    </div>
                  ))}
                </TabsContent>
              </Tabs>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Contract Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Salary</p>
                    <p className="font-medium">${selectedPlayer.contract.salary.toLocaleString()}/month</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contract Length</p>
                    <p className="font-medium">{selectedPlayer.contract.length} years</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Release Clause</p>
                    <p className="font-medium">${selectedPlayer.contract.releaseClause.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
