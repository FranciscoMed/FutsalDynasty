import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./dbStorage";
import { GameEngine } from "./gameEngine";
import { CompetitionEngine } from "./competitionEngine";
import { MatchEngine } from "./matchEngine";

export async function registerRoutes(app: Express): Promise<Server> {
  const competitionEngine = new CompetitionEngine(storage);

  app.post("/api/game/initialize", async (req, res) => {
    try {
      await storage.initializeGame();
      
      const gameState = await storage.getGameState();
      
      await competitionEngine.createLeagueCompetition(gameState.season, gameState.playerTeamId);
      
      await competitionEngine.createSecondDivisionLeague(gameState.season);
      
      await competitionEngine.createCupCompetition(gameState.season);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to initialize game:", error);
      res.status(500).json({ error: "Failed to initialize game" });
    }
  });

  app.get("/api/game/state", async (req, res) => {
    try {
      const gameState = await storage.getGameState();
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

  app.get("/api/teams/all", async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to get teams" });
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
    try {
      const updated = await storage.updateClub(req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update club" });
    }
  });

  app.get("/api/competitions", async (req, res) => {
    try {
      const gameState = await storage.getGameState();
      const competitions = await storage.getAllCompetitions();
      
      // Filter to only show competitions the player's team is in
      const playerCompetitions = competitions.filter(comp => 
        comp.teams.includes(gameState.playerTeamId)
      );
      
      // Resolve team names in standings
      for (const competition of playerCompetitions) {
        for (const standing of competition.standings) {
          const team = await storage.getTeam(standing.teamId);
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
    try {
      const gameState = await storage.getGameState();
      const allMatches = await storage.getAllMatches();
      
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
    try {
      const transactions = await storage.getAllFinancialTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get financial transactions" });
    }
  });

  const gameEngine = new GameEngine(storage);
  const matchEngine = new MatchEngine(storage);

  app.post("/api/matches/:id/simulate", async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const match = await matchEngine.simulateMatch(matchId);
      
      await competitionEngine.updateStandings(match.competitionId, match);
      
      await storage.createInboxMessage({
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
    try {
      const gameState = await gameEngine.advanceOneDay();
      res.json(gameState);
    } catch (error) {
      console.error("Error advancing day:", error);
      res.status(500).json({ error: "Failed to advance day" });
    }
  });

  app.post("/api/game/advance-days", async (req, res) => {
    try {
      const { days } = req.body;
      const gameState = await gameEngine.advanceDays(days);
      res.json(gameState);
    } catch (error) {
      console.error("Error advancing days:", error);
      res.status(500).json({ error: "Failed to advance days" });
    }
  });

  app.post("/api/game/advance-to-date", async (req, res) => {
    try {
      const { date } = req.body;
      const gameState = await gameEngine.advanceToDate(new Date(date));
      res.json(gameState);
    } catch (error) {
      console.error("Error advancing to date:", error);
      res.status(500).json({ error: "Failed to advance to date" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
