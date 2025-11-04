import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/game/initialize", async (req, res) => {
    try {
      await storage.initializeGame();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to initialize game" });
    }
  });

  app.get("/api/game/state", async (req, res) => {
    try {
      const gameState = await storage.getGameState();
      res.json(gameState);
    } catch (error) {
      res.status(500).json({ error: "Failed to get game state" });
    }
  });

  app.patch("/api/game/state", async (req, res) => {
    try {
      const updated = await storage.updateGameState(req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update game state" });
    }
  });

  app.get("/api/team/player", async (req, res) => {
    try {
      const gameState = await storage.getGameState();
      const team = await storage.getTeam(gameState.playerTeamId);
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to get player team" });
    }
  });

  app.get("/api/team/:id", async (req, res) => {
    try {
      const team = await storage.getTeam(parseInt(req.params.id));
      if (!team) {
        res.status(404).json({ error: "Team not found" });
        return;
      }
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to get team" });
    }
  });

  app.patch("/api/team/:id", async (req, res) => {
    try {
      const updated = await storage.updateTeam(parseInt(req.params.id), req.body);
      if (!updated) {
        res.status(404).json({ error: "Team not found" });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update team" });
    }
  });

  app.get("/api/players", async (req, res) => {
    try {
      const gameState = await storage.getGameState();
      const players = await storage.getPlayersByTeam(gameState.playerTeamId);
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to get players" });
    }
  });

  app.get("/api/players/:id", async (req, res) => {
    try {
      const player = await storage.getPlayer(parseInt(req.params.id));
      if (!player) {
        res.status(404).json({ error: "Player not found" });
        return;
      }
      res.json(player);
    } catch (error) {
      res.status(500).json({ error: "Failed to get player" });
    }
  });

  app.patch("/api/players/:id", async (req, res) => {
    try {
      const updated = await storage.updatePlayer(parseInt(req.params.id), req.body);
      if (!updated) {
        res.status(404).json({ error: "Player not found" });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update player" });
    }
  });

  app.get("/api/inbox", async (req, res) => {
    try {
      const messages = await storage.getAllInboxMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get inbox messages" });
    }
  });

  app.post("/api/inbox/:id/read", async (req, res) => {
    try {
      const updated = await storage.updateInboxMessage(parseInt(req.params.id), { read: true });
      if (!updated) {
        res.status(404).json({ error: "Message not found" });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  app.delete("/api/inbox/:id", async (req, res) => {
    try {
      const success = await storage.deleteInboxMessage(parseInt(req.params.id));
      if (!success) {
        res.status(404).json({ error: "Message not found" });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  app.get("/api/club", async (req, res) => {
    try {
      const club = await storage.getClub();
      res.json(club);
    } catch (error) {
      res.status(500).json({ error: "Failed to get club" });
    }
  });

  app.patch("/api/club", async (req, res) => {
    try {
      const updated = await storage.updateClub(req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update club" });
    }
  });

  app.get("/api/competitions", async (req, res) => {
    try {
      const competitions = await storage.getAllCompetitions();
      res.json(competitions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get competitions" });
    }
  });

  app.get("/api/matches", async (req, res) => {
    try {
      const matches = await storage.getAllMatches();
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: "Failed to get matches" });
    }
  });

  app.get("/api/finances", async (req, res) => {
    try {
      const transactions = await storage.getAllFinancialTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get financial transactions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
