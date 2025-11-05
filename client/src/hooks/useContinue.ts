import { useQuery } from "@tanstack/react-query";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import type { NextEvent } from "@shared/schema";
import { Calendar, Trophy, FileText, DollarSign, Award } from "lucide-react";

interface ContinueHookResult {
  nextEvent: NextEvent | null;
  isLoading: boolean;
  error: Error | null;
  buttonLabel: string;
  buttonIcon: any;
  advancementSpeed: number;
  refetch: () => void;
}

/**
 * Hook for managing the Continue button behavior
 * Fetches next event and determines button appearance/behavior
 */
export function useContinue(): ContinueHookResult {
  const { gameState } = useFutsalManager();

  const { data: nextEvent, isLoading, error, refetch } = useQuery<NextEvent>({
    queryKey: ["nextEvent", gameState?.currentDate],
    queryFn: async () => {
      const response = await fetch("/api/game/next-event");
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("No upcoming events");
        }
        throw new Error("Failed to fetch next event");
      }
      return response.json();
    },
    enabled: !!gameState,
    staleTime: 30000, // 30 seconds
    retry: false, // Don't retry on 404
  });

  // Determine button label based on event type
  const getButtonLabel = (): string => {
    if (!nextEvent) return "Continue";

    const daysText = nextEvent.daysUntil === 1 
      ? "1 day" 
      : `${nextEvent.daysUntil} days`;

    switch (nextEvent.type) {
      case "match":
        return `Continue to Match (${daysText})`;
      case "training_completion":
        return `Continue to Training (${daysText})`;
      case "contract_expiry":
        return `Continue to Contract Expiry (${daysText})`;
      case "month_end":
        return `Continue to Month End (${daysText})`;
      case "season_end":
        return `Continue to Season End (${daysText})`;
      default:
        return `Continue (${daysText})`;
    }
  };

  // Determine button icon based on event type
  const getButtonIcon = () => {
    if (!nextEvent) return Calendar;

    switch (nextEvent.type) {
      case "match":
        return Trophy;
      case "training_completion":
        return Award;
      case "contract_expiry":
        return FileText;
      case "month_end":
        return DollarSign;
      case "season_end":
        return Award;
      default:
        return Calendar;
    }
  };

  /**
   * Calculate animation speed based on days to advance
   * - Short periods (1-7 days): 100ms per day (realistic)
   * - Medium periods (8-30 days): 50ms per day (2x speed)
   * - Long periods (31+ days): 20ms per day (5x speed)
   * - Maximum total animation time: 3 seconds
   */
  const calculateAdvancementSpeed = (): number => {
    if (!nextEvent) return 100;

    const days = nextEvent.daysUntil;

    // Calculate base speed
    let msPerDay = 100; // Default: 100ms per day
    
    if (days <= 7) {
      msPerDay = 100; // 1x speed - up to 700ms total
    } else if (days <= 30) {
      msPerDay = 50; // 2x speed - up to 1500ms total
    } else {
      msPerDay = 20; // 5x speed - up to 600ms for 30 days
    }

    // Calculate total animation time
    const totalTime = days * msPerDay;
    
    // Cap at 3 seconds maximum
    if (totalTime > 3000) {
      msPerDay = Math.floor(3000 / days);
    }

    // Minimum 10ms per day (prevents instant skip)
    return Math.max(10, msPerDay);
  };

  return {
    nextEvent: nextEvent || null,
    isLoading,
    error: error as Error | null,
    buttonLabel: getButtonLabel(),
    buttonIcon: getButtonIcon(),
    advancementSpeed: calculateAdvancementSpeed(),
    refetch,
  };
}
