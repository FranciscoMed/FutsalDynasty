import { create } from "zustand";

interface User {
  id: number;
  username: string;
  email: string;
}

interface SaveGame {
  id: number;
  userId: number;
  name: string;
  currentDate: Date;
  season: number;
  playerTeamId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthState {
  user: User | null;
  activeSaveGame: SaveGame | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  checkSession: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setActiveSaveGame: (saveGame: SaveGame | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  activeSaveGame: null,
  isAuthenticated: false,
  isLoading: true,

  checkSession: async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();

      if (data.authenticated) {
        set({ 
          user: data.user, 
          isAuthenticated: true,
          isLoading: false 
        });
      } else {
        set({ 
          user: null, 
          isAuthenticated: false,
          isLoading: false 
        });
      }
    } catch (error) {
      console.error("Session check failed:", error);
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false 
      });
    }
  },

  login: async (username: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();
    set({ 
      user: data.user, 
      isAuthenticated: true,
      isLoading: false 
    });
  },

  register: async (username: string, email: string, password: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Registration failed");
    }

    const data = await response.json();
    set({ 
      user: data.user, 
      isAuthenticated: true,
      isLoading: false 
    });
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ 
      user: null, 
      activeSaveGame: null,
      isAuthenticated: false 
    });
  },

  setActiveSaveGame: (saveGame: SaveGame | null) => {
    set({ activeSaveGame: saveGame });
  },
}));
