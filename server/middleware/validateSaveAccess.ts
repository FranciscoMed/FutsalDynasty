import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { saveGames } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Middleware to validate that the authenticated user owns the requested save game.
 * This prevents users from accessing other users' save games by guessing savegameId values.
 * 
 * Usage:
 * - Place after authentication check (req.session.userId must exist)
 * - Extracts savegameId from route params, query params, or request body
 * - Queries database to verify userId + savegameId combination exists
 * - Returns 403 if user doesn't own the save game
 * - Attaches validatedSaveId and validatedUserId to res.locals for downstream handlers
 * 
 * @example
 * app.get("/api/teams/:savegameId", requireAuth, validateSaveAccess, async (req, res) => {
 *   const { validatedSaveId, validatedUserId } = res.locals;
 *   // Query with both IDs for security
 *   const teams = await storage.getTeams(validatedUserId, validatedSaveId);
 * });
 */
export async function validateSaveAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Authentication check - userId must exist in session
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const userId = req.session.userId;

  // Extract savegameId from multiple possible sources
  const savegameIdParam =
    req.params.savegameId ||
    req.params.saveGameId ||
    req.query.savegameId ||
    req.query.saveGameId ||
    req.body?.savegameId ||
    req.body?.saveGameId ||
    req.session.activeSaveGameId;

  if (!savegameIdParam) {
    res.status(400).json({ error: "Save game ID is required" });
    return;
  }

  const savegameId = parseInt(String(savegameIdParam), 10);

  if (isNaN(savegameId)) {
    res.status(400).json({ error: "Invalid save game ID format" });
    return;
  }

  try {
    // Verify user owns this save game
    // Using composite query: WHERE user_id = ? AND save_game_id = ?
    // This leverages the composite index: idx_save_games_user_savegame
    const [save] = await db
      .select({ id: saveGames.id })
      .from(saveGames)
      .where(and(eq(saveGames.id, savegameId), eq(saveGames.userId, userId)))
      .limit(1);

    if (!save) {
      // Either save game doesn't exist OR user doesn't own it
      // Return same error message for both cases to avoid information leakage
      res.status(403).json({ error: "Save game not found or access denied" });
      return;
    }

    // Attach validated IDs to res.locals for downstream route handlers
    res.locals.validatedSaveId = savegameId;
    res.locals.validatedUserId = userId;

    // Proceed to next middleware/handler
    next();
  } catch (error) {
    console.error("Save access validation error:", error);
    res.status(500).json({ error: "Failed to validate save game access" });
  }
}

/**
 * Lightweight middleware for routes that already check req.session.activeSaveGameId
 * Validates ownership of the active save game stored in session
 * 
 * @example
 * app.get("/api/game/state", requireAuth, validateActiveSave, async (req, res) => {
 *   const { validatedSaveId, validatedUserId } = res.locals;
 *   const gameState = await storage.getGameState(validatedSaveId, validatedUserId);
 * });
 */
export async function validateActiveSave(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (!req.session?.activeSaveGameId) {
    res.status(400).json({ error: "No active save game" });
    return;
  }

  const userId = req.session.userId;
  const savegameId = req.session.activeSaveGameId;

  try {
    const [save] = await db
      .select({ id: saveGames.id })
      .from(saveGames)
      .where(and(eq(saveGames.id, savegameId), eq(saveGames.userId, userId)))
      .limit(1);

    if (!save) {
      res.status(403).json({ error: "Active save game not found or access denied" });
      return;
    }

    res.locals.validatedSaveId = savegameId;
    res.locals.validatedUserId = userId;

    next();
  } catch (error) {
    console.error("Active save validation error:", error);
    res.status(500).json({ error: "Failed to validate active save game" });
  }
}
