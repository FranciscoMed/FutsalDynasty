import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./dbStorage";
import { GameEngine } from "./gameEngine";
import { CompetitionEngine } from "./competitionEngine";
import { MatchEngine } from "./matchEngine";
import { setupAuthRoutes } from "./authRoutes";

function requireSaveGame(req: any, res: any): number | null {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  if (!req.session?.activeSaveGameId) {
    res.status(400).json({ error: "No active save game" });
    return null;
  }
  return req.session.activeSaveGameId;
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuthRoutes(app, storage);
  
  const competitionEngine = new CompetitionEngine(storage);

  // Deprecated: Game initialization now handled by /api/savegames POST endpoint
  // This route is no longer used and should not be called
  app.post("/api/game/initialize", async (req, res) => {
    res.status(410).json({ 
      error: "This endpoint is deprecated. Please use /api/savegames to create a new game." 
    });
  });

  app.get("/api/game/state", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const gameState = await storage.getGameState(saveGameId);
      if (!gameState) {
        res.status(404).json({ error: "Game state not found" });
        return;
      }
      res.json(gameState);
    } catch (error) {
      console.error("Error getting game state:", error);
      res.status(500).json({ error: "Failed to get game state" });
    }
  });

  app.patch("/api/game/state", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const updated = await storage.updateGameState(saveGameId, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update game state" });
    }
  });

  app.get("/api/team/player", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const gameState = await storage.getGameState(saveGameId);
      const team = await storage.getTeam(saveGameId, gameState.playerTeamId);
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to get player team" });
    }
  });

  app.get("/api/team/:id", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const team = await storage.getTeam(saveGameId, parseInt(req.params.id));
      if (!team) {
        res.status(404).json({ error: "Team not found" });
        return;
      }
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to get team" });
    }
  });

  app.get("/api/teams/all", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const teams = await storage.getAllTeams(saveGameId);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to get teams" });
    }
  });

  app.patch("/api/team/:id", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const updated = await storage.updateTeam(saveGameId, parseInt(req.params.id), req.body);
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
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const gameState = await storage.getGameState(saveGameId);
      const players = await storage.getPlayersByTeam(saveGameId, gameState.playerTeamId);
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to get players" });
    }
  });

  app.get("/api/players/:id", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const player = await storage.getPlayer(saveGameId, parseInt(req.params.id));
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
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const updated = await storage.updatePlayer(saveGameId, parseInt(req.params.id), req.body);
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
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const messages = await storage.getAllInboxMessages(saveGameId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get inbox messages" });
    }
  });

  app.post("/api/inbox/:id/read", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const updated = await storage.updateInboxMessage(saveGameId, parseInt(req.params.id), { read: true });
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
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const success = await storage.deleteInboxMessage(saveGameId, parseInt(req.params.id));
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
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const club = await storage.getClub(saveGameId);
      if (!club) {
        res.status(404).json({ error: "Club not found. Please initialize the game first." });
        return;
      }
      res.json(club);
    } catch (error) {
      console.error("Error getting club:", error);
      res.status(500).json({ error: "Failed to get club" });
    }
  });

  app.patch("/api/club", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const updated = await storage.updateClub(saveGameId, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update club" });
    }
  });

  app.get("/api/competitions", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const gameState = await storage.getGameState(saveGameId);
      const competitions = await storage.getAllCompetitions(saveGameId);
      
      // Filter to only show competitions the player's team is in
      const playerCompetitions = competitions.filter(comp => 
        comp.teams.includes(gameState.playerTeamId)
      );
      
      // Resolve team names in standings
      for (const competition of playerCompetitions) {
        for (const standing of competition.standings) {
          const team = await storage.getTeam(saveGameId, standing.teamId);
          if (team) {
            standing.teamName = team.name;
          }
        }
      }
      
      res.json(playerCompetitions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get competitions" });
    }
  });

  app.get("/api/matches", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const gameState = await storage.getGameState(saveGameId);
      const allMatches = await storage.getAllMatches(saveGameId);
      
      // Filter to only show matches involving the player's team
      const playerMatches = allMatches.filter(match => 
        match.homeTeamId === gameState.playerTeamId || 
        match.awayTeamId === gameState.playerTeamId
      );
      
      res.json(playerMatches);
    } catch (error) {
      res.status(500).json({ error: "Failed to get matches" });
    }
  });

  app.get("/api/finances", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const transactions = await storage.getAllFinancialTransactions(saveGameId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get financial transactions" });
    }
  });

  const gameEngine = new GameEngine(storage);
  const matchEngine = new MatchEngine(storage);

  app.post("/api/matches/:id/simulate", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const matchId = parseInt(req.params.id);
      const match = await matchEngine.simulateMatch(saveGameId, matchId);
      
      await competitionEngine.updateStandings(saveGameId, match.competitionId, match);
      
      await storage.createInboxMessage(saveGameId, {
        category: "match",
        subject: `Match Result: ${match.homeScore} - ${match.awayScore}`,
        body: `Your match has been completed.\n\nFinal Score: ${match.homeScore} - ${match.awayScore}\n\nCheck the match details for full statistics.`,
        from: "Match Officials",
        date: match.date,
        read: false,
        starred: false,
        priority: "high",
        actionLink: `/matches/${matchId}`,
      });
      
      res.json(match);
    } catch (error) {
      console.error("Error simulating match:", error);
      res.status(500).json({ error: "Failed to simulate match" });
    }
  });

  app.post("/api/game/advance-day", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const gameState = await gameEngine.advanceOneDay(saveGameId);
      res.json(gameState);
    } catch (error) {
      console.error("Error advancing day:", error);
      res.status(500).json({ error: "Failed to advance day" });
    }
  });

  app.post("/api/game/advance-days", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const { days } = req.body;
      const gameState = await gameEngine.advanceDays(saveGameId, days);
      res.json(gameState);
    } catch (error) {
      console.error("Error advancing days:", error);
      res.status(500).json({ error: "Failed to advance days" });
    }
  });

  app.post("/api/game/advance-to-date", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const { date } = req.body;
      const gameState = await gameEngine.advanceToDate(saveGameId, new Date(date));
      res.json(gameState);
    } catch (error) {
      console.error("Error advancing to date:", error);
      res.status(500).json({ error: "Failed to advance to date" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
