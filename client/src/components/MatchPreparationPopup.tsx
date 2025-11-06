import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, Trophy, Play, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { TacticsReview } from "./TacticsReview";
import { TacticsReviewV2 } from "./match-prep/TacticsReviewV2";
import { OpponentAnalysis } from "./OpponentAnalysis";
import type { Formation as OldFormation, TacticalPreset, Player } from "@shared/schema";
import type { Formation } from "@/lib/formations";

interface MatchPreparationData {
  match: {
    id: number;
    homeTeamName: string;
    awayTeamName: string;
    competitionName: string;
    date: string;
  };
  playerTeam: {
    id: number;
    name: string;
    formation: Formation;
    tacticalPreset: TacticalPreset;
    startingLineup: number[];
    substitutes: number[];
    squad: Player[];
    tactics?: {
      formation: Formation;
      assignments: Record<string, number | null>;
      substitutes: (number | null)[];
    };
  };
  opponent: {
    team: {
      id: number;
      name: string;
      reputation: number;
    };
    rating: number;
    form: string[];
    topPlayers: Array<{
      id: number;
      name: string;
      position: string;
      rating: number;
    }>;
  };
  isHome: boolean;
  venue: string;
}

interface MatchPreparationPopupProps {
  matchId: number;
  onClose: () => void;
}

export function MatchPreparationPopup({ matchId, onClose }: MatchPreparationPopupProps) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [currentTab, setCurrentTab] = useState("tactics");
  
  // Local state for NEW tactics system
  const [formation, setFormation] = useState<Formation>("3-1");
  const [assignments, setAssignments] = useState<Record<string, number | null>>({});
  const [substitutes, setSubstitutes] = useState<(number | null)[]>([null, null, null, null, null]);
  const [hasChanges, setHasChanges] = useState(false);

  // Handle tactics change from TacticsReviewV2 - memoized to prevent re-renders
  const handleTacticsChange = useCallback((data: {
    formation: Formation;
    assignments: Record<string, number | null>;
    substitutes: (number | null)[];
  }) => {
    console.log('Tactics changed in parent:', data);
    setFormation(data.formation);
    setAssignments(data.assignments);
    setSubstitutes(data.substitutes);
  }, []);

  // Fetch match preparation data
  const { data, isLoading, error } = useQuery<MatchPreparationData>({
    queryKey: ["matchPreparation", matchId],
    queryFn: async () => {
      const response = await fetch(`/api/matches/${matchId}/preparation`);
      if (!response.ok) throw new Error("Failed to fetch match preparation data");
      return response.json();
    },
    staleTime: Infinity,
  });

  // Initialize with existing tactics from team data (only once when data loads)
  useEffect(() => {
    if (data?.playerTeam) {
      console.log('Match prep data loaded:', {
        hasTactics: !!data.playerTeam.tactics,
        tactics: data.playerTeam.tactics,
        currentAssignments: assignments,
        currentSubstitutes: substitutes
      });
      
      // Check if we should load saved tactics (only if we haven't set anything yet)
      const hasNoAssignments = Object.keys(assignments).length === 0;
      const hasNoSubstitutes = substitutes.every(s => s === null);
      const shouldLoadTactics = hasNoAssignments && hasNoSubstitutes;
      
      if (shouldLoadTactics && data.playerTeam.tactics) {
        const savedTactics = data.playerTeam.tactics;
        console.log('Loading saved tactics from database:', savedTactics);
        
        if (savedTactics.formation) {
          setFormation(savedTactics.formation as Formation);
        }
        if (savedTactics.assignments && Object.keys(savedTactics.assignments).length > 0) {
          setAssignments(savedTactics.assignments);
        }
        if (savedTactics.substitutes && savedTactics.substitutes.length > 0) {
          setSubstitutes(savedTactics.substitutes);
        }
      } else {
        console.log('Not loading tactics:', {
          shouldLoadTactics,
          hasTactics: !!data.playerTeam.tactics
        });
      }
    }
  }, [data]);

  // Track changes
  useEffect(() => {
    if (data) {
      const changed = 
        formation !== "3-1" || // Default formation
        Object.keys(assignments).length > 0 ||
        substitutes.some(s => s !== null);
      setHasChanges(changed);
    }
  }, [formation, assignments, substitutes, data]);

  // Confirm tactics and start match mutation
  const confirmTacticsMutation = useMutation({
    mutationFn: async () => {
      // First, confirm tactics
      const confirmResponse = await fetch(`/api/matches/${matchId}/confirm-tactics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formation,
          assignments,
          substitutes,
        }),
      });
      if (!confirmResponse.ok) throw new Error("Failed to confirm tactics");
      
      // Then, immediately simulate the match
      const simulateResponse = await fetch(`/api/matches/${matchId}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!simulateResponse.ok) throw new Error("Failed to simulate match");
      
      return simulateResponse.json();
    },
    onSuccess: (matchResult) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["nextUnplayedMatch"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      
      // Navigate directly to the match result page
      setLocation(`/matches/${matchId}`);
      onClose();
    },
  });

  // Validation
  const filledPositions = Object.values(assignments).filter(id => id !== null).length;
  const hasGoalkeeperAssigned = Object.entries(assignments).some(([slotId]) => slotId === "gk");
  const isValid = filledPositions === 5 && hasGoalkeeperAssigned;

  const handleConfirmTactics = () => {
    if (!isValid) return;
    confirmTacticsMutation.mutate();
  };

  if (isLoading) {
    return (
      <Dialog open={true} modal={true}>
        <DialogContent className="max-w-4xl h-[90vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-[#d18643]" />
            <p className="text-muted-foreground">Loading match preparation...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !data) {
    return (
      <Dialog open={true} modal={true} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Failed to load match preparation data. Please try again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} modal={true}>
      <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold text-[#1B4332] flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#2D6A4F]" />
            Match Day Preparation
          </DialogTitle>
          <div className="space-y-2">
            <div className="flex items-center gap-6 text-base font-semibold text-foreground mt-2">
              <span className={data.isHome ? "text-[#1B4332]" : ""}>
                {data.match.homeTeamName}
              </span>
              <span className="text-2xl text-[#2D6A4F]">vs</span>
              <span className={!data.isHome ? "text-[#1B4332]" : ""}>
                {data.match.awayTeamName}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <Badge variant="outline" className="flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                {data.match.competitionName}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(data.match.date), "EEEE, MMMM d, yyyy")}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {data.venue}
              </Badge>
              <Badge variant={data.isHome ? "default" : "secondary"} className={data.isHome ? "bg-[#2D6A4F]" : ""}>
                {data.isHome ? "Home Match" : "Away Match"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs Content - Scrollable */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="h-full flex flex-col">
            <TabsList className="mx-6 mt-4">
              <TabsTrigger value="tactics" className="flex-1">
                Your Tactics
              </TabsTrigger>
              <TabsTrigger value="opponent" className="flex-1">
                Opponent Analysis
              </TabsTrigger>
              <TabsTrigger value="overview" className="flex-1">
                Match Overview
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <TabsContent value="tactics" className="mt-0 space-y-4">
                <TacticsReviewV2
                  squad={data.playerTeam.squad}
                  initialFormation={formation}
                  initialAssignments={assignments}
                  initialSubstitutes={substitutes}
                  onTacticsChange={handleTacticsChange}
                />
              </TabsContent>

              <TabsContent value="opponent" className="mt-0">
                <OpponentAnalysis opponent={data.opponent} />
              </TabsContent>

              <TabsContent value="overview" className="mt-0 space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Match Day Briefing:</strong> Review your tactics and analyze the opponent before confirming.
                    Your team is ready and waiting for your final instructions.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold text-lg mb-3 text-[#1B4332]">Your Team</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Formation:</span>
                        <span className="font-semibold">{formation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Starting XI:</span>
                        <span className="font-semibold">{filledPositions}/5</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Substitutes:</span>
                        <span className="font-semibold">{substitutes.filter(s => s !== null).length}/5</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Venue:</span>
                        <span className="font-semibold">{data.isHome ? "Home" : "Away"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-card">
                    <h3 className="font-semibold text-lg mb-3 text-[#1B4332]">Opponent</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Team:</span>
                        <span className="font-semibold">{data.opponent.team.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Team Rating:</span>
                        <span className="font-semibold">{data.opponent.rating}/20</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reputation:</span>
                        <span className="font-semibold">{data.opponent.team.reputation}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recent Form:</span>
                        <div className="flex gap-1">
                          {data.opponent.form.slice(0, 5).map((result, idx) => (
                            <span
                              key={idx}
                              className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${
                                result === "W" ? "bg-green-500 text-white" :
                                result === "D" ? "bg-yellow-500 text-white" :
                                "bg-red-500 text-white"
                              }`}
                            >
                              {result}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {hasChanges && (
                  <Alert className="border-[#2D6A4F] bg-[#2D6A4F]/5">
                    <AlertCircle className="h-4 w-4 text-[#2D6A4F]" />
                    <AlertDescription className="text-[#1B4332]">
                      You have unsaved tactical changes. Click "Confirm Tactics & Start Match" to save your tactics and immediately start the match simulation.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {!isValid && (
                <span className="text-red-600 font-semibold">
                  ⚠ Please ensure you have 5 players including a goalkeeper
                </span>
              )}
              {isValid && hasChanges && (
                <span className="text-[#2D6A4F] font-semibold">
                  ✓ Tactics modified and ready to confirm
                </span>
              )}
              {isValid && !hasChanges && (
                <span className="text-[#2D6A4F] font-semibold">
                  ✓ Lineup valid and ready
                </span>
              )}
            </div>
            <Button
              onClick={handleConfirmTactics}
              disabled={!isValid || confirmTacticsMutation.isPending}
              size="lg"
              className="bg-[#2D6A4F] hover:bg-[#1B4332] text-white gap-2"
            >
              {confirmTacticsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting Match...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Confirm Tactics & Start Match
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
