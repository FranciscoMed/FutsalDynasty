import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import type { IStorage } from "./storage";
import { SeedEngine } from "./seedEngine";

declare module 'express-session' {
  interface SessionData {
    userId: number;
    activeSaveGameId: number | null;
  }
}

export function setupAuthRoutes(app: Express, storage: IStorage) {
  app.post("/api/auth/register", async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        res.status(400).json({ error: "Username, email, and password are required" });
        return;
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        res.status(400).json({ error: "Username already exists" });
        return;
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        res.status(400).json({ error: "Email already exists" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        createdAt: new Date(),
      });

      req.session.userId = user.id;
      req.session.activeSaveGameId = null;

      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: "Username and password are required" });
        return;
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      req.session.userId = user.id;
      req.session.activeSaveGameId = null;

      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        } 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response): Promise<void> => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: "Logout failed" });
        return;
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/session", async (req: Request, res: Response): Promise<void> => {
    if (!req.session.userId) {
      res.json({ authenticated: false });
      return;
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        res.json({ authenticated: false });
        return;
      }

      res.json({ 
        authenticated: true, 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        },
        activeSaveGameId: req.session.activeSaveGameId
      });
    } catch (error) {
      console.error("Session check error:", error);
      res.status(500).json({ error: "Session check failed" });
    }
  });

  app.get("/api/savegames", async (req: Request, res: Response): Promise<void> => {
    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const saveGames = await storage.getSaveGamesByUser(req.session.userId);
      res.json(saveGames);
    } catch (error) {
      console.error("Get save games error:", error);
      res.status(500).json({ error: "Failed to fetch save games" });
    }
  });

  app.post("/api/savegames", async (req: Request, res: Response): Promise<void> => {
    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const { name, teamName, teamAbbr } = req.body;

      if (!name || !teamName || !teamAbbr) {
        res.status(400).json({ error: "Name, team name, and team abbreviation are required" });
        return;
      }

      const season = 2024;
      const currentDate = new Date(season, 7, 1);

      const saveGame = await storage.createSaveGame({
        userId: req.session.userId,
        name,
        currentDate,
        season,
        playerTeamId: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const seedEngine = new SeedEngine(storage);
      const seedResult = await seedEngine.seedNewGame({
        saveGameId: saveGame.id,
        playerTeamName: teamName,
        playerTeamAbbr: teamAbbr,
        season,
      });

      await storage.updateSaveGame(saveGame.id, {
        playerTeamId: seedResult.playerTeamId,
      });

      req.session.activeSaveGameId = saveGame.id;

      const updatedSaveGame = await storage.getSaveGame(saveGame.id);
      res.json(updatedSaveGame);
    } catch (error) {
      console.error("Create save game error:", error);
      res.status(500).json({ error: "Failed to create save game" });
    }
  });

  app.post("/api/savegames/:id/load", async (req: Request, res: Response): Promise<void> => {
    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const saveGameId = parseInt(req.params.id);
      const saveGame = await storage.getSaveGame(saveGameId);

      if (!saveGame) {
        res.status(404).json({ error: "Save game not found" });
        return;
      }

      if (saveGame.userId !== req.session.userId) {
        res.status(403).json({ error: "Not authorized to load this save game" });
        return;
      }

      req.session.activeSaveGameId = saveGameId;
      res.json({ success: true, saveGame });
    } catch (error) {
      console.error("Load save game error:", error);
      res.status(500).json({ error: "Failed to load save game" });
    }
  });

  app.delete("/api/savegames/:id", async (req: Request, res: Response): Promise<void> => {
    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const saveGameId = parseInt(req.params.id);
      const saveGame = await storage.getSaveGame(saveGameId);

      if (!saveGame) {
        res.status(404).json({ error: "Save game not found" });
        return;
      }

      if (saveGame.userId !== req.session.userId) {
        res.status(403).json({ error: "Not authorized to delete this save game" });
        return;
      }

      await storage.deleteSaveGame(saveGameId);

      if (req.session.activeSaveGameId === saveGameId) {
        req.session.activeSaveGameId = null;
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete save game error:", error);
      res.status(500).json({ error: "Failed to delete save game" });
    }
  });

  app.post("/api/admin/cleanup-orphaned-data", async (req: Request, res: Response): Promise<void> => {
    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const orphanedSaveGameIds = await storage.findOrphanedSaveGameIds();
      
      let totalDeleted = 0;
      const cleanedSaveGames: number[] = [];
      
      for (const saveGameId of orphanedSaveGameIds) {
        const result = await storage.cleanupSaveGameData(saveGameId);
        totalDeleted += result.deletedRecords;
        cleanedSaveGames.push(saveGameId);
      }

      res.json({ 
        success: true, 
        message: orphanedSaveGameIds.length === 0 
          ? "No orphaned data found" 
          : `Cleaned up data for ${orphanedSaveGameIds.length} orphaned save game(s)`,
        orphanedSaveGameIds: cleanedSaveGames,
        deletedRecords: totalDeleted 
      });
    } catch (error) {
      console.error("Cleanup orphaned data error:", error);
      res.status(500).json({ error: "Failed to cleanup orphaned data" });
    }
  });
}
