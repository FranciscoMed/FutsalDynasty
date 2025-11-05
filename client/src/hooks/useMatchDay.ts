import { useQuery } from "@tanstack/react-query";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";

interface MatchDayInfo {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  date: string;
  competitionId: number;
  competitionName: string;
  competitionType: string;
  played: boolean;
  preparationStatus?: string;
}

/**
 * Hook to detect if there's a match today that requires user preparation
 * Returns the next unplayed match involving the player's team
 */
export function useMatchDay() {
  const { gameState } = useFutsalManager();
  
  const { data: nextMatch, isLoading, refetch } = useQuery<MatchDayInfo | null>({
    queryKey: ["nextUnplayedMatch", gameState?.currentDate],
    queryFn: async () => {
      const response = await fetch("/api/matches/next-unplayed");
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch next unplayed match");
      }
      return response.json();
    },
    enabled: !!gameState,
    refetchInterval: false,
    staleTime: Infinity, // Don't refetch until manually invalidated
    refetchOnWindowFocus: false,
  });

  // Check if the match is on today's date
  const isMatchToday = nextMatch && gameState ? (() => {
    const matchDate = new Date(nextMatch.date);
    const currentDate = new Date(gameState.currentDate);
    
    matchDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    return matchDate.getTime() === currentDate.getTime();
  })() : false;

  // Determine if we should show the popup
  const hasMatchToday = !!nextMatch && 
    isMatchToday && 
    (!nextMatch.preparationStatus || nextMatch.preparationStatus === "pending");

  return { 
    nextMatch, 
    isLoading, 
    hasMatchToday,
    isMatchToday,
    refetch,
  };
}
