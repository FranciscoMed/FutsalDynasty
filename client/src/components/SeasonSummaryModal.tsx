import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Users, Target, Award } from "lucide-react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";

interface SeasonSummaryModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Season Summary Modal
 * Shows when season ends - displays achievements, stats, and season review
 */
export function SeasonSummaryModal({ open, onClose }: SeasonSummaryModalProps) {
  const { gameState, playerTeam, players, club } = useFutsalManager();
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (open) {
      setAcknowledged(false);
    }
  }, [open]);

  const handleAcknowledge = () => {
    setAcknowledged(true);
    onClose();
  };

  if (!gameState || !playerTeam || !club) {
    return null;
  }

  // Calculate season stats
  const averageAge = players.length > 0
    ? Math.round(players.reduce((sum, p) => sum + p.age, 0) / players.length)
    : 0;

  const averageRating = players.length > 0
    ? Math.round(players.reduce((sum, p) => sum + p.currentAbility, 0) / players.length)
    : 0;

  const completedObjectives = club.boardObjectives?.filter(obj => obj.completed).length || 0;
  const totalObjectives = club.boardObjectives?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Season {gameState.season} Complete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Season Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Season Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Team</p>
                  <p className="text-xl font-bold">{playerTeam.name}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Season</p>
                  <p className="text-xl font-bold">{gameState.season}/{ gameState.season + 1}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Squad Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Squad Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{players.length}</p>
                  <p className="text-sm text-muted-foreground">Squad Size</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{averageAge}</p>
                  <p className="text-sm text-muted-foreground">Average Age</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{averageRating}</p>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Board Objectives */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Board Objectives
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Objectives Completed</span>
                <Badge variant={completedObjectives === totalObjectives ? "default" : "secondary"}>
                  {completedObjectives} / {totalObjectives}
                </Badge>
              </div>
              
              {club.boardObjectives?.map((objective, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="font-medium">{objective.description}</p>
                    <p className="text-sm text-muted-foreground">Target: {objective.target}</p>
                  </div>
                  <Badge variant={objective.completed ? "default" : "outline"}>
                    {objective.completed ? "✓ Completed" : "Incomplete"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Current Budget</p>
                  <p className="text-2xl font-bold">${club.budget.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Wage Budget</p>
                  <p className="text-2xl font-bold">${club.wageBudget.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Season Message */}
          <Card className="bg-gradient-to-r from-primary/10 to-success/10">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Trophy className="w-12 h-12 mx-auto text-yellow-500" />
                <h3 className="text-xl font-bold">
                  {completedObjectives === totalObjectives
                    ? "Outstanding Performance!"
                    : completedObjectives >= totalObjectives / 2
                    ? "Good Season!"
                    : "Room for Improvement"}
                </h3>
                <p className="text-muted-foreground">
                  {completedObjectives === totalObjectives
                    ? "You've exceeded all board expectations this season!"
                    : completedObjectives >= totalObjectives / 2
                    ? "You've met most of the board's expectations."
                    : "The board expects better results next season."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAcknowledge}
            size="lg"
            className="w-full"
          >
            Continue to Next Season
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
