import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  Player,
  Team,
  Match,
  Competition,
  InboxMessage,
  GameState,
  Club,
  FinancialTransaction,
} from "@shared/schema";

interface FutsalManagerState {
  initialized: boolean;
  loading: boolean;
  
  gameState: GameState | null;
  playerTeam: Team | null;
  players: Player[];
  allTeams: Team[];
  competitions: Competition[];
  inboxMessages: InboxMessage[];
  financialTransactions: FinancialTransaction[];
  club: Club | null;
  
  unreadInboxCount: number;
  
  initializeGame: () => Promise<void>;
  loadGameData: () => Promise<void>;
  refreshPlayers: () => Promise<void>;
  refreshInbox: () => Promise<void>;
  markMessageAsRead: (messageId: number) => Promise<void>;
  updatePlayerTeam: (updates: Partial<Team>) => Promise<void>;
  updatePlayer: (playerId: number, updates: Partial<Player>) => Promise<void>;
}

export const useFutsalManager = create<FutsalManagerState>()(
  subscribeWithSelector((set, get) => ({
    initialized: false,
    loading: false,
    
    gameState: null,
    playerTeam: null,
    players: [],
    allTeams: [],
    competitions: [],
    inboxMessages: [],
    financialTransactions: [],
    club: null,
    
    unreadInboxCount: 0,
    
    initializeGame: async () => {
      set({ loading: true });
      try {
        await fetch("/api/game/initialize", { method: "POST" });
        await get().loadGameData();
        set({ initialized: true });
      } catch (error) {
        console.error("Failed to initialize game:", error);
      } finally {
        set({ loading: false });
      }
    },
    
    loadGameData: async () => {
      set({ loading: true });
      try {
        const [gameStateRes, teamRes, playersRes, inboxRes, clubRes] = await Promise.all([
          fetch("/api/game/state"),
          fetch("/api/team/player"),
          fetch("/api/players"),
          fetch("/api/inbox"),
          fetch("/api/club"),
        ]);
        
        const gameState = await gameStateRes.json();
        const playerTeam = await teamRes.json();
        const players = await playersRes.json();
        const inboxMessages = await inboxRes.json();
        const club = await clubRes.json();
        
        const unreadCount = inboxMessages.filter((m: InboxMessage) => !m.read).length;
        
        set({
          gameState,
          playerTeam,
          players,
          inboxMessages,
          club,
          unreadInboxCount: unreadCount,
        });
      } catch (error) {
        console.error("Failed to load game data:", error);
      } finally {
        set({ loading: false });
      }
    },
    
    refreshPlayers: async () => {
      try {
        const response = await fetch("/api/players");
        const players = await response.json();
        set({ players });
      } catch (error) {
        console.error("Failed to refresh players:", error);
      }
    },
    
    refreshInbox: async () => {
      try {
        const response = await fetch("/api/inbox");
        const inboxMessages = await response.json();
        const unreadCount = inboxMessages.filter((m: InboxMessage) => !m.read).length;
        set({ inboxMessages, unreadInboxCount: unreadCount });
      } catch (error) {
        console.error("Failed to refresh inbox:", error);
      }
    },
    
    markMessageAsRead: async (messageId: number) => {
      try {
        await fetch(`/api/inbox/${messageId}/read`, { method: "POST" });
        await get().refreshInbox();
      } catch (error) {
        console.error("Failed to mark message as read:", error);
      }
    },
    
    updatePlayerTeam: async (updates: Partial<Team>) => {
      const { playerTeam } = get();
      if (!playerTeam) return;
      
      try {
        const response = await fetch(`/api/team/${playerTeam.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        const updated = await response.json();
        set({ playerTeam: updated });
      } catch (error) {
        console.error("Failed to update team:", error);
      }
    },
    
    updatePlayer: async (playerId: number, updates: Partial<Player>) => {
      try {
        const response = await fetch(`/api/players/${playerId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        const updated = await response.json();
        
        const players = get().players.map(p => p.id === playerId ? updated : p);
        set({ players });
      } catch (error) {
        console.error("Failed to update player:", error);
      }
    },
  }))
);
