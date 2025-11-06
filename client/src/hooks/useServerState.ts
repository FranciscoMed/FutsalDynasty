/**
 * Server State Hooks using TanStack Query
 * 
 * These hooks manage all server-side game data with automatic caching,
 * refetching, and invalidation. Use these instead of the old Zustand store
 * for any data that comes from the backend.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  GameState,
  Team,
  Player,
  Competition,
  Match,
  InboxMessage,
  Club,
  FinancialTransaction,
} from "@shared/schema";

// Local type for upcoming fixtures (includes team names)
export interface UpcomingFixture {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  date: string;
  venue: string;
  competitionName: string;
  competitionType: string;
  homeScore?: number;
  awayScore?: number;
  played: boolean;
}

/**
 * Query Keys - Centralized for consistent cache management
 */
export const queryKeys = {
  gameState: ["gameState"] as const,
  playerTeam: ["playerTeam"] as const,
  players: ["players"] as const,
  allTeams: ["teams", "all"] as const,
  competitions: (teamId?: number) => ["competitions", teamId] as const,
  matches: {
    all: (teamId?: number) => ["matches", "all", teamId] as const,
    upcoming: (teamId?: number) => ["matches", "upcoming", teamId] as const,
    byId: (id: number) => ["matches", id] as const,
  },
  inbox: ["inbox"] as const,
  club: ["club"] as const,
  financialTransactions: ["financialTransactions"] as const,
  nextMatch: (date?: string) => ["matches", "next-unplayed", date] as const,
} as const;

/**
 * Game State Hook
 */
export function useGameState() {
  return useQuery<GameState>({
    queryKey: queryKeys.gameState,
    queryFn: async () => {
      const response = await fetch("/api/game/state");
      if (!response.ok) throw new Error("Failed to fetch game state");
      return response.json();
    },
    staleTime: Infinity, // Only refetch on manual invalidation
    gcTime: Infinity, // Keep in cache forever
  });
}

/**
 * Player Team Hook
 */
export function usePlayerTeam() {
  return useQuery<Team>({
    queryKey: queryKeys.playerTeam,
    queryFn: async () => {
      const response = await fetch("/api/team/player");
      if (!response.ok) throw new Error("Failed to fetch player team");
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Players Hook
 */
export function usePlayers() {
  return useQuery<Player[]>({
    queryKey: queryKeys.players,
    queryFn: async () => {
      const response = await fetch("/api/players");
      if (!response.ok) throw new Error("Failed to fetch players");
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * All Teams Hook
 */
export function useAllTeams() {
  return useQuery<Team[]>({
    queryKey: queryKeys.allTeams,
    queryFn: async () => {
      const response = await fetch("/api/teams");
      if (!response.ok) throw new Error("Failed to fetch teams");
      return response.json();
    },
    staleTime: 300000, // 5 minutes (teams rarely change)
  });
}

/**
 * Competitions Hook
 */
export function useCompetitions() {
  const { data: gameState } = useGameState();
  
  return useQuery<Competition[]>({
    queryKey: queryKeys.competitions(gameState?.playerTeamId),
    queryFn: async () => {
      const response = await fetch("/api/competitions");
      if (!response.ok) throw new Error("Failed to fetch competitions");
      return response.json();
    },
    enabled: !!gameState,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Matches Hook
 */
export function useMatches() {
  const { data: gameState } = useGameState();
  
  return useQuery<UpcomingFixture[]>({
    queryKey: queryKeys.matches.all(gameState?.playerTeamId),
    queryFn: async () => {
      const response = await fetch("/api/matches");
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
    enabled: !!gameState,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Upcoming Matches Hook
 */
export function useUpcomingMatches() {
  const { data: gameState } = useGameState();
  
  return useQuery<UpcomingFixture[]>({
    queryKey: queryKeys.matches.upcoming(gameState?.playerTeamId),
    queryFn: async () => {
      const response = await fetch("/api/matches/upcoming");
      if (!response.ok) throw new Error("Failed to fetch upcoming matches");
      return response.json();
    },
    enabled: !!gameState,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Next Unplayed Match Hook
 */
export function useNextMatch() {
  const { data: gameState } = useGameState();
  const currentDateStr = gameState?.currentDate ? new Date(gameState.currentDate).toISOString() : undefined;
  
  return useQuery<Match | null>({
    queryKey: queryKeys.nextMatch(currentDateStr),
    queryFn: async () => {
      const response = await fetch("/api/matches/next-unplayed");
      if (!response.ok) throw new Error("Failed to fetch next match");
      return response.json();
    },
    enabled: !!gameState,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Inbox Hook
 */
export function useInbox() {
  return useQuery<InboxMessage[]>({
    queryKey: queryKeys.inbox,
    queryFn: async () => {
      const response = await fetch("/api/inbox");
      if (!response.ok) throw new Error("Failed to fetch inbox");
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Unread Inbox Count (derived from inbox data)
 */
export function useUnreadCount() {
  const { data: messages = [] } = useInbox();
  return messages.filter(m => !m.read).length;
}

/**
 * Club Hook
 */
export function useClub() {
  return useQuery<Club>({
    queryKey: queryKeys.club,
    queryFn: async () => {
      const response = await fetch("/api/club");
      if (!response.ok) throw new Error("Failed to fetch club");
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Financial Transactions Hook
 */
export function useFinancialTransactions() {
  return useQuery<FinancialTransaction[]>({
    queryKey: queryKeys.financialTransactions,
    queryFn: async () => {
      const response = await fetch("/api/finances/transactions");
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Mark Message as Read Mutation
 */
export function useMarkMessageAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/inbox/${messageId}/read`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to mark message as read");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate inbox to refetch with updated read status
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
    },
  });
}

/**
 * Update Player Team Mutation
 */
export function useUpdatePlayerTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ teamId, updates }: { teamId: number; updates: Partial<Team> }) => {
      const response = await fetch(`/api/team/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update team");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playerTeam });
    },
  });
}

/**
 * Update Player Mutation
 */
export function useUpdatePlayer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ playerId, updates }: { playerId: number; updates: Partial<Player> }) => {
      const response = await fetch(`/api/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update player");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.players });
    },
  });
}
