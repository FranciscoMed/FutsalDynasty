/**
 * UI State Store using Zustand
 * 
 * This store manages ONLY UI-related state (modals, popups, selections, etc.).
 * Do NOT put server data here - use TanStack Query hooks (useServerState.ts) instead.
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface UIState {
  // App initialization
  initialized: boolean;
  
  // Match popup state
  pendingMatchId: number | null;
  showMatchPopup: boolean;
  
  // Season summary modal
  showSeasonSummary: boolean;
  
  // Generic modal/dialog state
  activeModal: string | null;
  
  // Actions
  setInitialized: (initialized: boolean) => void;
  setPendingMatch: (matchId: number | null) => void;
  setShowMatchPopup: (show: boolean) => void;
  setShowSeasonSummary: (show: boolean) => void;
  setActiveModal: (modal: string | null) => void;
  reset: () => void;
}

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set) => ({
    // Initial state
    initialized: false,
    pendingMatchId: null,
    showMatchPopup: false,
    showSeasonSummary: false,
    activeModal: null,
    
    // Actions
    setInitialized: (initialized: boolean) => {
      set({ initialized });
    },
    
    setPendingMatch: (matchId: number | null) => {
      set({ pendingMatchId: matchId });
    },
    
    setShowMatchPopup: (show: boolean) => {
      set({ showMatchPopup: show });
      if (!show) {
        // Clear pending match when closing popup
        set({ pendingMatchId: null });
      }
    },
    
    setShowSeasonSummary: (show: boolean) => {
      set({ showSeasonSummary: show });
    },
    
    setActiveModal: (modal: string | null) => {
      set({ activeModal: modal });
    },
    
    reset: () => {
      set({
        initialized: false,
        pendingMatchId: null,
        showMatchPopup: false,
        showSeasonSummary: false,
        activeModal: null,
      });
    },
  }))
);

/**
 * Selectors for optimized component subscriptions
 */
export const selectPendingMatch = (state: UIState) => state.pendingMatchId;
export const selectShowMatchPopup = (state: UIState) => state.showMatchPopup;
export const selectShowSeasonSummary = (state: UIState) => state.showSeasonSummary;
export const selectInitialized = (state: UIState) => state.initialized;
