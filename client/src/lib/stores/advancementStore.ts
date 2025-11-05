import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { GameEvent, NextEvent } from "@shared/schema";

interface AdvancementStore {
  // State
  isAdvancing: boolean;
  isPaused: boolean;
  isStopping: boolean;
  currentDate: string | null;
  targetDate: string | null;
  currentDay: number;
  totalDays: number;
  eventsEncountered: GameEvent[];
  targetEvent: NextEvent | null;
  error: string | null;
  lastResult: { showSeasonSummary?: boolean } | null;
  
  // Calculated values
  progress: number; // 0-100
  
  // Actions
  startAdvancement: (targetDate: string, targetEvent: NextEvent, currentDate: string) => void;
  pauseAdvancement: () => void;
  resumeAdvancement: () => void;
  stopAdvancement: () => void;
  updateProgress: (currentDate: string, currentDay: number) => void;
  addEvent: (event: GameEvent) => void;
  setError: (error: string | null) => void;
  completeAdvancement: (result?: { showSeasonSummary?: boolean }) => void;
  reset: () => void;
}

/**
 * Zustand store for managing time advancement state
 * Tracks progress, pause/resume, and events encountered during advancement
 */
export const useAdvancementStore = create<AdvancementStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isAdvancing: false,
    isPaused: false,
    isStopping: false,
    currentDate: null,
    targetDate: null,
    currentDay: 0,
    totalDays: 0,
    eventsEncountered: [],
    targetEvent: null,
    error: null,
    lastResult: null,
    progress: 0,

    /**
     * Start time advancement
     */
    startAdvancement: (targetDate: string, targetEvent: NextEvent, currentDate: string) => {
      const totalDays = targetEvent.daysUntil;
      
      set({
        isAdvancing: true,
        isPaused: false,
        isStopping: false,
        targetDate,
        targetEvent,
        currentDate,
        currentDay: 0,
        totalDays,
        eventsEncountered: [],
        error: null,
        progress: 0,
      });
    },

    /**
     * Pause advancement (user can resume)
     */
    pauseAdvancement: () => {
      set({ isPaused: true });
    },

    /**
     * Resume paused advancement
     */
    resumeAdvancement: () => {
      set({ isPaused: false });
    },

    /**
     * Stop advancement (user cancellation - cannot resume)
     */
    stopAdvancement: () => {
      set({ 
        isStopping: true,
        isPaused: false,
      });
    },

    /**
     * Update progress during advancement
     */
    updateProgress: (currentDate: string, currentDay: number) => {
      const { totalDays } = get();
      const progress = totalDays > 0 ? Math.min(100, (currentDay / totalDays) * 100) : 0;
      
      set({
        currentDate,
        currentDay,
        progress,
      });
    },

    /**
     * Add event encountered during advancement
     */
    addEvent: (event: GameEvent) => {
      set((state) => ({
        eventsEncountered: [...state.eventsEncountered, event],
      }));
    },

    /**
     * Set error message
     */
    setError: (error: string | null) => {
      set({ error });
    },

    /**
     * Complete advancement successfully
     */
    completeAdvancement: (result?: { showSeasonSummary?: boolean }) => {
      set({
        isAdvancing: false,
        isPaused: false,
        isStopping: false,
        progress: 100,
        lastResult: result || null,
      });
    },

    /**
     * Reset store to initial state
     */
    reset: () => {
      set({
        isAdvancing: false,
        isPaused: false,
        isStopping: false,
        currentDate: null,
        targetDate: null,
        currentDay: 0,
        totalDays: 0,
        eventsEncountered: [],
        targetEvent: null,
        error: null,
        lastResult: null,
        progress: 0,
      });
    },
  }))
);

/**
 * Selectors for optimized component subscriptions
 */
export const selectIsAdvancing = (state: AdvancementStore) => state.isAdvancing;
export const selectIsPaused = (state: AdvancementStore) => state.isPaused;
export const selectProgress = (state: AdvancementStore) => state.progress;
export const selectEventsEncountered = (state: AdvancementStore) => state.eventsEncountered;
export const selectError = (state: AdvancementStore) => state.error;
export const selectCurrentDay = (state: AdvancementStore) => state.currentDay;
export const selectTotalDays = (state: AdvancementStore) => state.totalDays;
