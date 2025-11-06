import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Play, Pause, Square, Calendar, Trophy, DollarSign, Award, Check } from "lucide-react";
import { format } from "date-fns";
import { useAdvancementStore, selectProgress, selectEventsEncountered } from "@/lib/stores/advancementStore";
import { advancementEngine } from "@/lib/advancementEngine";
import { cn } from "@/lib/utils";

interface AdvancementOverlayProps {
  onComplete?: (result?: { showSeasonSummary?: boolean }) => void;
}

/**
 * Full-screen overlay showing advancement progress
 * Displays animated date changes, progress bar, and controls
 */
export function AdvancementOverlay({ onComplete }: AdvancementOverlayProps) {
  const {
    isAdvancing,
    isPaused,
    currentDate,
    currentDay,
    totalDays,
    targetEvent,
    error,
    lastResult,
    totalMatchesSimulated,
  } = useAdvancementStore();

  const progress = useAdvancementStore(selectProgress);
  const eventsEncountered = useAdvancementStore(selectEventsEncountered);

  const [showStopDialog, setShowStopDialog] = useState(false);
  const [dateKey, setDateKey] = useState(0); // For triggering animation

  // Trigger date flip animation when date changes
  useEffect(() => {
    if (currentDate) {
      setDateKey(prev => prev + 1);
    }
  }, [currentDate]);

  // Cleanup on unmount or completion
  useEffect(() => {
    if (!isAdvancing && currentDay > 0) {
      // Advancement completed
      const timer = setTimeout(() => {
        const result = useAdvancementStore.getState().lastResult;
        useAdvancementStore.getState().reset();
        if (onComplete) {
          onComplete(result || undefined);
        }
      }, 1500); // Show completed state briefly

      return () => clearTimeout(timer);
    }
  }, [isAdvancing, currentDay, onComplete]);

  // Don't render if not advancing
  if (!isAdvancing && currentDay === 0) {
    return null;
  }

  const handlePauseResume = () => {
    if (isPaused) {
      advancementEngine.resume();
    } else {
      advancementEngine.pause();
    }
  };

  const handleStopClick = () => {
    setShowStopDialog(true);
  };

  const handleStopConfirm = () => {
    advancementEngine.stop();
    setShowStopDialog(false);
  };

  // Calculate speed indicator
  const getSpeedLabel = () => {
    if (!targetEvent) return "1x";
    const days = targetEvent.daysUntil;
    if (days <= 7) return "1x";
    if (days <= 30) return "2x";
    return "5x";
  };

  // Get event icon
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "match":
        return Trophy;
      case "month_end":
        return DollarSign;
      case "training_completion":
      case "season_end":
        return Award;
      default:
        return Calendar;
    }
  };

  return (
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
        <Card className="w-full max-w-2xl mx-4 shadow-2xl border-2">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">
              Advancing Time
            </CardTitle>
            
            {/* Animated current date */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Calendar className="w-6 h-6 text-muted-foreground" />
              <div
                key={dateKey}
                className="text-4xl font-bold text-center animate-in zoom-in duration-300"
              >
                {currentDate ? format(new Date(currentDate), "MMM d, yyyy") : "..."}
              </div>
            </div>

            {/* Target event badge */}
            {targetEvent && (
              <div className="flex justify-center pt-2">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  Target: {targetEvent.description}
                </Badge>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Progress bar */}
            <div className="space-y-2">
              <Progress 
                value={progress} 
                className="h-4 transition-all duration-300 ease-out"
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Day <span className="font-semibold text-foreground">{currentDay}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalDays}</span>
                </span>
                <span className="font-semibold text-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Speed indicator */}
            <div className="flex justify-center">
              <Badge variant="outline" className="text-xs">
                Speed: {getSpeedLabel()}
              </Badge>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">
                  Error: {error}
                </p>
              </div>
            )}

            {/* Events encountered */}
            {eventsEncountered.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Events Encountered:
                </h4>
                <ScrollArea className="h-32 rounded-md border bg-muted/30 p-3">
                  <div className="space-y-2">
                    {eventsEncountered.map((event, index) => {
                      const EventIcon = getEventIcon(event.type);
                      return (
                        <div
                          key={event.id}
                          className="flex items-start gap-2 p-2 bg-background rounded animate-in slide-in-from-left duration-300"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <EventIcon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">
                              {event.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.date), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Simulation Summary */}
            {totalMatchesSimulated > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Simulated {totalMatchesSimulated} background {totalMatchesSimulated === 1 ? 'match' : 'matches'}
                  </span>
                </div>
              </div>
            )}

            {/* Control buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handlePauseResume}
                variant="outline"
                className="flex-1 h-11"
                disabled={!isAdvancing}
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                onClick={handleStopClick}
                variant="destructive"
                className="flex-1 h-11"
                disabled={!isAdvancing}
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </div>

            {/* Completion message */}
            {!isAdvancing && progress === 100 && (
              <div className="text-center py-2">
                <Badge variant="default" className="animate-in zoom-in duration-300">
                  ✓ Advancement Complete
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stop confirmation dialog */}
      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Time Advancement?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to stop advancing time? Progress will be saved at day {currentDay} of {totalDays}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStopConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
