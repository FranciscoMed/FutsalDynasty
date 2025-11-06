import { useAdvancementStore } from "./stores/advancementStore";
import { queryClient } from "./queryClient";
import { queryKeys } from "../hooks/useServerState";
import { toast } from "sonner";
import type { NextEvent, GameEvent, EventType, GameState } from "@shared/schema";

interface AdvancementResult {
  success: boolean;
  stopped: boolean;
  stoppedForEvent?: EventType;
  error?: string;
  finalDate?: string;
  matchEncountered?: boolean;
  seasonEndEncountered?: boolean;
  showSeasonSummary?: boolean;
}

/**
 * Advancement Engine
 * Handles the day-by-day advancement loop with pause/stop support
 */
export class AdvancementEngine {
  private abortController: AbortController | null = null;
  private animationFrameId: number | null = null;

  /**
   * Start advancement to target date
   * Uses requestAnimationFrame for smooth animation
   */
  async advanceToEvent(
    targetEvent: NextEvent,
    msPerDay: number,
    onProgress?: (currentDay: number, currentDate: string) => void
  ): Promise<AdvancementResult> {
    // Create abort controller for cancellation
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const store = useAdvancementStore.getState();
    
    // Get game state from query cache
    const gameState = queryClient.getQueryData<GameState>(queryKeys.gameState);
    if (!gameState) {
      throw new Error("Game state not loaded");
    }
    
    const startDate = new Date(gameState.currentDate);
    const targetDate = new Date(targetEvent.date);
    
    // Initialize advancement state
    store.startAdvancement(
      targetDate.toISOString(),
      targetEvent,
      startDate.toISOString()
    );

    let currentDay = 0;
    const totalDays = targetEvent.daysUntil;
    let lastAdvanceTime = Date.now();

    try {
      // Main advancement loop
      while (currentDay < totalDays) {
        // Check for cancellation
        if (signal.aborted) {
          return { success: false, stopped: true };
        }

        // Check for pause
        const state = useAdvancementStore.getState();
        if (state.isPaused) {
          // Wait for resume or stop
          await this.waitForResume(signal);
          if (signal.aborted) {
            return { success: false, stopped: true };
          }
          lastAdvanceTime = Date.now(); // Reset timer after resume
          continue;
        }

        // Wait for animation timing
        const now = Date.now();
        const elapsed = now - lastAdvanceTime;
        if (elapsed < msPerDay) {
          await this.sleep(msPerDay - elapsed, signal);
          if (signal.aborted) {
            return { success: false, stopped: true };
          }
        }

        lastAdvanceTime = Date.now();

        // Advance one day on server
        const response = await fetch("/api/game/advance-until", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetDate: targetDate.toISOString(),
            currentDay: currentDay + 1,
          }),
          signal,
        });

        if (!response.ok) {
          throw new Error("Failed to advance day");
        }

        const result = await response.json();
        currentDay++;

        // Update progress with simulated matches count
        const matchesSimulated = result.simulationSummary?.matchesSimulated || 0;
        store.updateProgress(result.currentDate, currentDay, matchesSimulated);
        
        // Invalidate relevant queries to refresh UI
        await queryClient.invalidateQueries({ queryKey: queryKeys.gameState });
        await queryClient.invalidateQueries({ queryKey: queryKeys.competitions() });
        await queryClient.invalidateQueries({ queryKey: queryKeys.matches.all() });
        await queryClient.invalidateQueries({ queryKey: queryKeys.inbox });

        // Call progress callback
        if (onProgress) {
          onProgress(currentDay, result.currentDate);
        }

        // Check for match events
        if (result.matchesToday && result.matchesToday.length > 0) {
          for (const match of result.matchesToday) {
            const event: GameEvent = {
              id: `match-${match.id}`,
              type: "match",
              date: match.date,
              description: `Match: ${match.homeTeamName} vs ${match.awayTeamName}`,
              priority: 1,
              processed: false,
              details: {
                matchId: match.id,
                competitionId: match.competitionId,
              },
            };
            
            // Handle match event
            const { shouldStop, eventType, showSeasonSummary } = await this.handleEvent(event, result.currentDate);
            
            if (shouldStop) {
              store.completeAdvancement({ showSeasonSummary });
              return {
                success: true,
                stopped: false,
                stoppedForEvent: eventType,
                finalDate: result.currentDate,
                matchEncountered: true,
                showSeasonSummary,
              };
            }
          }
        }

        // Check for month-end (detect month change)
        const previousDate = new Date(result.currentDate);
        previousDate.setDate(previousDate.getDate() - 1);
        const currentDateObj = new Date(result.currentDate);
        
        if (previousDate.getMonth() !== currentDateObj.getMonth()) {
          const monthEndEvent: GameEvent = {
            id: `month-end-${currentDateObj.getTime()}`,
            type: "month_end",
            date: result.currentDate,
            description: `End of ${previousDate.toLocaleDateString("en-US", { month: "long" })}`,
            priority: 4,
            processed: false,
            details: {
              month: currentDateObj.getMonth() + 1,
              year: currentDateObj.getFullYear(),
            },
          };
          
          await this.handleEvent(monthEndEvent, result.currentDate);
        }

        // Check if backend says we should complete
        if (result.complete) {
          // Check for season end
          if (result.nextEvent?.type === "season_end") {
            const seasonEndEvent: GameEvent = {
              id: `season-end-${currentDateObj.getTime()}`,
              type: "season_end",
              date: result.currentDate,
              description: "Season Complete",
              priority: 5,
              processed: false,
              details: {
                season: gameState?.season,
              },
            };
            
            const { shouldStop, eventType, showSeasonSummary } = await this.handleEvent(seasonEndEvent, result.currentDate);
            
            if (shouldStop) {
              store.completeAdvancement({ showSeasonSummary });
              return {
                success: true,
                stopped: false,
                stoppedForEvent: eventType,
                finalDate: result.currentDate,
                seasonEndEncountered: true,
                showSeasonSummary,
              };
            }
          }
          
          store.completeAdvancement();
          return {
            success: true,
            stopped: false,
            finalDate: result.currentDate,
            matchEncountered: result.nextEvent?.type === "match",
          };
        }
      }

      // Completed successfully
      store.completeAdvancement();
      
      // Get updated game state from cache
      const updatedGameState = queryClient.getQueryData<GameState>(queryKeys.gameState);
      
      return {
        success: true,
        stopped: false,
        finalDate: updatedGameState?.currentDate.toString() || new Date().toISOString(),
      };

    } catch (error: any) {
      if (error.name === "AbortError") {
        return { success: false, stopped: true };
      }

      const errorMessage = error.message || "Unknown error during advancement";
      store.setError(errorMessage);
      
      return {
        success: false,
        stopped: false,
        error: errorMessage,
      };
    } finally {
      this.cleanup();
    }
  }

  /**
   * Stop advancement immediately
   */
  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    useAdvancementStore.getState().stopAdvancement();
  }

  /**
   * Pause advancement
   */
  pause(): void {
    useAdvancementStore.getState().pauseAdvancement();
  }

  /**
   * Resume advancement
   */
  resume(): void {
    useAdvancementStore.getState().resumeAdvancement();
  }

  /**
   * Handle events encountered during advancement
   * Returns true if advancement should stop
   */
  private async handleEvent(
    event: GameEvent,
    currentDate: string
  ): Promise<{ shouldStop: boolean; eventType?: EventType; showSeasonSummary?: boolean }> {
    const store = useAdvancementStore.getState();

    switch (event.type) {
      case "match":
        // Match day - MUST STOP for user to confirm tactics
        toast.info("Match Day!", {
          description: event.description,
          duration: 3000,
        });
        return { shouldStop: true, eventType: "match" };

      case "training_completion":
        // Training completed - AUTO PROCESS
        toast.success("Training Completed", {
          description: event.details?.playerName 
            ? `Training completed for ${event.details.playerName}`
            : "Monthly training completed",
          duration: 2000,
        });
        // Add to events list
        store.addEvent(event);
        return { shouldStop: false };

      case "month_end":
        // Month end - AUTO PROCESS (finances already processed by backend)
        const monthDate = new Date(currentDate);
        const monthName = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        toast.info("Month Ended", {
          description: `${monthName} - Budget updated`,
          duration: 2000,
        });
        // Add to events list
        store.addEvent(event);
        return { shouldStop: false };

      case "contract_expiry":
        // Contract expiring - NOTIFICATION ONLY
        toast.warning("Contract Expiring Soon", {
          description: event.description,
          duration: 3000,
        });
        // Add to events list
        store.addEvent(event);
        return { shouldStop: false };

      case "season_end":
        // Season end - MUST STOP for user to see summary
        toast.success("Season Complete!", {
          description: "Review your season performance",
          duration: 4000,
        });
        return { shouldStop: true, eventType: "season_end", showSeasonSummary: true };

      default:
        // Unknown event type - just add to list
        store.addEvent(event);
        return { shouldStop: false };
    }
  }

  /**
   * Wait for user to resume or stop
   */
  private async waitForResume(signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (signal.aborted) {
          clearInterval(checkInterval);
          reject(new Error("Aborted"));
          return;
        }

        const state = useAdvancementStore.getState();
        if (!state.isPaused || state.isStopping) {
          clearInterval(checkInterval);
          
          if (state.isStopping) {
            reject(new Error("Stopped"));
          } else {
            resolve();
          }
        }
      }, 100); // Check every 100ms
    });
  }

  /**
   * Sleep with cancellation support
   */
  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      
      if (signal) {
        signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new Error("Aborted"));
        });
      }
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.abortController = null;
    this.animationFrameId = null;
  }
}

/**
 * Singleton instance
 */
export const advancementEngine = new AdvancementEngine();
