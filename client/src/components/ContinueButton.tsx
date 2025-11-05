import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useContinue } from "@/hooks/useContinue";
import { useAdvancementStore } from "@/lib/stores/advancementStore";
import { advancementEngine } from "@/lib/advancementEngine";
import { cn } from "@/lib/utils";

interface ContinueButtonProps {
  onStart?: () => void;
  onComplete?: () => void;
  className?: string;
}

/**
 * Smart Continue Button
 * Automatically detects next event and advances time with animation
 */
export function ContinueButton({ onStart, onComplete, className }: ContinueButtonProps) {
  const {
    nextEvent,
    isLoading,
    buttonLabel,
    buttonIcon: Icon,
    advancementSpeed,
  } = useContinue();

  const { isAdvancing } = useAdvancementStore();

  const handleContinue = async () => {
    if (!nextEvent || isAdvancing) return;

    // Notify parent component
    if (onStart) {
      onStart();
    }

    try {
      // Start advancement with animation
      const result = await advancementEngine.advanceToEvent(
        nextEvent,
        advancementSpeed,
        (currentDay, currentDate) => {
          // Progress callback - could be used for additional effects
          console.log(`Advancing: Day ${currentDay} - ${currentDate}`);
        }
      );

      // Notify completion
      if (onComplete) {
        onComplete();
      }

      // Handle result
      if (result.success) {
        if (result.matchEncountered) {
          console.log("Match day reached - popup will show automatically");
        } else {
          console.log("Advanced to target date successfully");
        }
      } else if (result.stopped) {
        console.log("Advancement stopped by user");
      } else if (result.error) {
        console.error("Advancement error:", result.error);
      }
    } catch (error) {
      console.error("Failed to start advancement:", error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Button
        size="lg"
        disabled
        className={cn(
          "w-full md:w-auto min-w-[240px] h-12 text-base font-semibold",
          className
        )}
      >
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  // No events available
  if (!nextEvent) {
    return (
      <Button
        size="lg"
        disabled
        variant="outline"
        className={cn(
          "w-full md:w-auto min-w-[240px] h-12 text-base font-semibold",
          className
        )}
      >
        No upcoming events
      </Button>
    );
  }

  // Ready to continue
  return (
    <Button
      size="lg"
      onClick={handleContinue}
      disabled={isAdvancing}
      className={cn(
        "w-full md:w-auto min-w-[240px] h-12 text-base font-semibold",
        "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
        "shadow-lg hover:shadow-xl transition-all duration-200",
        "relative overflow-hidden group",
        isAdvancing && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {/* Animated background pulse */}
      {!isAdvancing && (
        <span className="absolute inset-0 bg-white/20 animate-pulse" />
      )}
      
      {/* Button content */}
      <span className="relative flex items-center justify-center gap-2">
        {isAdvancing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
        )}
        <span>{isAdvancing ? "Advancing..." : buttonLabel}</span>
      </span>
    </Button>
  );
}
