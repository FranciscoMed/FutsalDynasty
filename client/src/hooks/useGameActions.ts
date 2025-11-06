/**
 * Game Actions Hook - Bridge between TanStack Query and UI Store
 * 
 * This hook provides game actions that coordinate between server mutations
 * and UI state updates. Use this for all game-changing actions.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./useServerState";
import { useUIStore } from "../lib/stores/useUIStore";
import { toast } from "sonner";

export function useGameActions() {
  const queryClient = useQueryClient();
  const uiStore = useUIStore();
  
  /**
   * Initialize Game
   */
  const initializeGame = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/game/initialize", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to initialize game");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all queries to load fresh data
      queryClient.invalidateQueries();
      uiStore.setInitialized(true);
      toast.success("Game initialized successfully!");
    },
    onError: (error: Error) => {
      console.error("Failed to initialize game:", error);
      toast.error("Failed to initialize game");
    },
  });
  
  /**
   * Advance Day
   * Note: This is for single-day advancement. For multi-day, use advancementEngine.
   */
  const advanceDay = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/game/advance-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to advance day");
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate game state and related data
      queryClient.invalidateQueries({ queryKey: queryKeys.gameState });
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
      
      // Check if there's a match today
      if (data.matchToday) {
        uiStore.setPendingMatch(data.matchToday.id);
        uiStore.setShowMatchPopup(true);
      }
      
      // Check for season end
      if (data.seasonEnded) {
        uiStore.setShowSeasonSummary(true);
      }
    },
    onError: (error: Error) => {
      console.error("Failed to advance day:", error);
      toast.error("Failed to advance day");
    },
  });
  
  /**
   * Simulate Match (AI vs AI)
   */
  const simulateMatch = useMutation({
    mutationFn: async (matchId: number) => {
      const response = await fetch(`/api/matches/${matchId}/simulate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to simulate match");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate match and competition data
      queryClient.invalidateQueries({ queryKey: queryKeys.matches.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.competitions() });
      toast.success("Match simulated successfully!");
    },
    onError: (error: Error) => {
      console.error("Failed to simulate match:", error);
      toast.error("Failed to simulate match");
    },
  });
  
  /**
   * Complete Training Month
   */
  const completeTraining = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/training/complete-month", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to complete training");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate player data
      queryClient.invalidateQueries({ queryKey: queryKeys.players });
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
      toast.success("Training month completed!");
    },
    onError: (error: Error) => {
      console.error("Failed to complete training:", error);
      toast.error("Failed to complete training");
    },
  });
  
  /**
   * Save Tactics
   */
  const saveTactics = useMutation({
    mutationFn: async (data: { formation: string; lineup: number[]; substitutes: number[] }) => {
      const response = await fetch("/api/team/tactics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save tactics");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playerTeam });
      toast.success("Tactics saved successfully!");
    },
    onError: (error: Error) => {
      console.error("Failed to save tactics:", error);
      toast.error("Failed to save tactics");
    },
  });
  
  return {
    initializeGame,
    advanceDay,
    simulateMatch,
    completeTraining,
    saveTactics,
  };
}

/**
 * Convenience hook for loading all game data
 * Use this sparingly - prefer granular queries for better performance
 */
export function useLoadGameData() {
  const queryClient = useQueryClient();
  
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.gameState }),
      queryClient.invalidateQueries({ queryKey: queryKeys.playerTeam }),
      queryClient.invalidateQueries({ queryKey: queryKeys.players }),
      queryClient.invalidateQueries({ queryKey: queryKeys.club }),
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox }),
    ]);
  };
}
