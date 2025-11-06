/**
 * DEPRECATED: useFutsalManager (Backward Compatibility Layer)
 * 
 * This hook provides backward compatibility during the migration to the new
 * hybrid state management approach (TanStack Query + UI Store).
 * 
 * NEW CODE SHOULD USE:
 * - useServerState hooks (useGameState, usePlayers, etc.) for server data
 * - useUIStore for UI state
 * - useGameActions for mutations
 * 
 * This wrapper will be removed once all components are migrated.
 */

import {
  useGameState,
  usePlayers,
  usePlayerTeam,
  useCompetitions,
  useInbox,
  useClub,
  useUnreadCount,
  useMarkMessageAsRead,
  useUpdatePlayer,
  useUpdatePlayerTeam,
} from "../../hooks/useServerState";
import { useUIStore } from "./useUIStore";
import { useGameActions, useLoadGameData } from "../../hooks/useGameActions";
import type {
  Player,
  Team,
  Competition,
  InboxMessage,
  GameState,
  Club,
} from "@shared/schema";

/**
 * Backward Compatibility Wrapper
 * This provides the same interface as the old useFutsalManager but uses the new hybrid approach
 */
export function useFutsalManager() {
  // Server state from TanStack Query
  const { data: gameState, isLoading: loadingGameState } = useGameState();
  const { data: playerTeam, isLoading: loadingTeam } = usePlayerTeam();
  const { data: players = [], isLoading: loadingPlayers } = usePlayers();
  const { data: competitions = [], isLoading: loadingCompetitions } = useCompetitions();
  const { data: inboxMessages = [], isLoading: loadingInbox } = useInbox();
  const { data: club, isLoading: loadingClub } = useClub();
  const unreadInboxCount = useUnreadCount();
  
  // UI state from Zustand
  const uiState = useUIStore();
  
  // Actions
  const gameActions = useGameActions();
  const loadGameData = useLoadGameData();
  const markMessageAsReadMutation = useMarkMessageAsRead();
  const updatePlayerMutation = useUpdatePlayer();
  const updatePlayerTeamMutation = useUpdatePlayerTeam();
  
  // Compute loading state
  const loading = loadingGameState || loadingTeam || loadingPlayers || 
                  loadingCompetitions || loadingInbox || loadingClub;
  
  return {
    // Server state (read-only)
    gameState: gameState ?? null,
    playerTeam: playerTeam ?? null,
    players,
    competitions,
    inboxMessages,
    club: club ?? null,
    unreadInboxCount,
    
    // Loading states
    loading,
    initialized: uiState.initialized,
    
    // UI state
    pendingMatchId: uiState.pendingMatchId,
    showMatchPopup: uiState.showMatchPopup,
    
    // Actions
    initializeGame: () => gameActions.initializeGame.mutateAsync(),
    loadGameData,
    refreshPlayers: loadGameData, // Simplified - invalidates all
    refreshInbox: loadGameData, // Simplified - invalidates all
    markMessageAsRead: (messageId: number) => markMessageAsReadMutation.mutateAsync(messageId),
    updatePlayerTeam: (updates: Partial<Team>) => {
      if (!playerTeam) return Promise.resolve();
      return updatePlayerTeamMutation.mutateAsync({ teamId: playerTeam.id, updates });
    },
    updatePlayer: (playerId: number, updates: Partial<Player>) =>
      updatePlayerMutation.mutateAsync({ playerId, updates }),
    setPendingMatch: uiState.setPendingMatch,
    setShowMatchPopup: uiState.setShowMatchPopup,
  };
}
