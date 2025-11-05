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
      
      // Batch fetch all teams once to avoid N+1 query problem
      const allTeams = await storage.getAllTeams(saveGameId);
      const teamMap = new Map(allTeams.map(team => [team.id, team.name]));
      
      // Enrich competitions with team names in standings and fixtures
      for (const competition of playerCompetitions) {
        // Resolve team names in standings
        for (const standing of competition.standings) {
          standing.teamName = teamMap.get(standing.teamId) || 'Unknown';
        }
        
        // Enrich fixtures with team names
        competition.fixtures = competition.fixtures.map(fixture => ({
          ...fixture,
          homeTeamName: teamMap.get(fixture.homeTeamId) || 'Unknown',
          awayTeamName: teamMap.get(fixture.awayTeamId) || 'Unknown',
        }));
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
      
      // Sort by date (most recent first) and apply pagination
      const limit = parseInt(req.query.limit as string) || 50; // Default to 50 matches
      const sortedMatches = playerMatches
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
      
      // Batch fetch all teams once to avoid N+1 query problem
      const allTeams = await storage.getAllTeams(saveGameId);
      const teamMap = new Map(allTeams.map(team => [team.id, team.name]));
      
      // Enrich matches with team names
      const enrichedMatches = sortedMatches.map(match => ({
        ...match,
        homeTeamName: teamMap.get(match.homeTeamId) || 'Unknown',
        awayTeamName: teamMap.get(match.awayTeamId) || 'Unknown',
      }));
      
      res.json(enrichedMatches);
    } catch (error) {
      res.status(500).json({ error: "Failed to get matches" });
    }
  });

  app.get("/api/matches/upcoming", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const gameState = await storage.getGameState(saveGameId);
      const competitions = await storage.getAllCompetitions(saveGameId);
      
      // Batch fetch all teams once to avoid N+1 query problem
      const allTeams = await storage.getAllTeams(saveGameId);
      const teamMap = new Map(allTeams.map(team => [team.id, team.name]));
      
      const upcomingFixtures: any[] = [];
      
      for (const competition of competitions) {
        if (!competition.teams.includes(gameState.playerTeamId)) continue;
        
        const upcomingMatches = competition.fixtures
          .filter(match => 
            !match.played && 
            (match.homeTeamId === gameState.playerTeamId || match.awayTeamId === gameState.playerTeamId)
          )
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (upcomingMatches.length > 0) {
          for (const match of upcomingMatches) {
            upcomingFixtures.push({
              ...match,
              competitionName: competition.name,
              competitionType: competition.type,
              homeTeamName: teamMap.get(match.homeTeamId) || 'Unknown',
              awayTeamName: teamMap.get(match.awayTeamId) || 'Unknown',
            });
          }
        }
      }
      
      upcomingFixtures.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      res.json(upcomingFixtures);
    } catch (error) {
      console.error("Error fetching upcoming fixtures:", error);
      res.status(500).json({ error: "Failed to get upcoming fixtures" });
    }
  });

  // Get next unplayed match requiring user action
  app.get("/api/matches/next-unplayed", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const nextMatch = await gameEngine.getNextUnplayedMatchForPlayer(saveGameId);
      
      if (!nextMatch) {
        res.json(null);
        return;
      }

      // Enrich with team names
      const allTeams = await storage.getAllTeams(saveGameId);
      const teamMap = new Map(allTeams.map(team => [team.id, team.name]));

      const enrichedMatch = {
        ...nextMatch,
        homeTeamName: teamMap.get(nextMatch.homeTeamId) || 'Unknown',
        awayTeamName: teamMap.get(nextMatch.awayTeamId) || 'Unknown',
      };

      res.json(enrichedMatch);
    } catch (error) {
      console.error("Error fetching next unplayed match:", error);
      res.status(500).json({ error: "Failed to get next unplayed match" });
    }
  });

  // Get match preparation data
  app.get("/api/matches/:id/preparation", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const matchId = parseInt(req.params.id);
      const gameState = await storage.getGameState(saveGameId);
      
      // Get match details
      const match = await storage.getMatch(saveGameId, matchId);
      if (!match) {
        res.status(404).json({ error: "Match not found" });
        return;
      }

      // Get teams
      const homeTeam = await storage.getTeam(saveGameId, match.homeTeamId);
      const awayTeam = await storage.getTeam(saveGameId, match.awayTeamId);
      const playerTeam = await storage.getTeam(saveGameId, gameState.playerTeamId);

      // Determine which is the opponent
      const isHome = match.homeTeamId === gameState.playerTeamId;
      const opponentTeam = isHome ? awayTeam : homeTeam;

      // Get player team squad
      const playerSquad = await storage.getPlayersByTeam(saveGameId, gameState.playerTeamId);

      // Get opponent squad for analysis
      const opponentSquad = await storage.getPlayersByTeam(
        saveGameId,
        opponentTeam!.id
      );

      // Calculate opponent team rating
      const opponentRating = opponentSquad.reduce(
        (sum, p) => sum + p.currentAbility, 
        0
      ) / opponentSquad.length;

      // Get recent matches for form
      const allMatches = await storage.getAllMatches(saveGameId);
      const opponentRecentMatches = allMatches
        .filter(m => 
          m.played && 
          (m.homeTeamId === opponentTeam!.id || m.awayTeamId === opponentTeam!.id)
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      // Calculate form
      const opponentForm = opponentRecentMatches.map(m => {
        const isOpponentHome = m.homeTeamId === opponentTeam!.id;
        const opponentScore = isOpponentHome ? m.homeScore : m.awayScore;
        const otherScore = isOpponentHome ? m.awayScore : m.homeScore;
        
        if (opponentScore > otherScore) return 'W';
        if (opponentScore < otherScore) return 'L';
        return 'D';
      });

      // Get top 3 opponent players
      const topOpponentPlayers = opponentSquad
        .sort((a, b) => b.currentAbility - a.currentAbility)
        .slice(0, 3)
        .map(p => ({
          id: p.id,
          name: p.name,
          position: p.position,
          rating: Math.round(p.currentAbility / 10),
        }));

      // Get competition info
      const competition = await storage.getCompetition(saveGameId, match.competitionId);

      res.json({
        match: {
          ...match,
          homeTeamName: homeTeam?.name || 'Unknown',
          awayTeamName: awayTeam?.name || 'Unknown',
          competitionName: competition?.name || 'Unknown',
        },
        playerTeam: {
          ...playerTeam,
          squad: playerSquad,
        },
        opponent: {
          team: opponentTeam,
          rating: Math.round(opponentRating / 10),
          form: opponentForm,
          topPlayers: topOpponentPlayers,
        },
        isHome,
        venue: isHome ? homeTeam?.stadium : awayTeam?.stadium,
      });
    } catch (error) {
      console.error("Error fetching match preparation data:", error);
      res.status(500).json({ error: "Failed to get match preparation data" });
    }
  });

  // Confirm tactics before match simulation
  app.post("/api/matches/:id/confirm-tactics", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const matchId = parseInt(req.params.id);
      const { formation, tacticalPreset, startingLineup } = req.body;

      const gameState = await storage.getGameState(saveGameId);
      const match = await storage.getMatch(saveGameId, matchId);

      if (!match) {
        res.status(404).json({ error: "Match not found" });
        return;
      }

      // Verify match involves player's team
      if (match.homeTeamId !== gameState.playerTeamId && 
          match.awayTeamId !== gameState.playerTeamId) {
        res.status(403).json({ error: "This match doesn't involve your team" });
        return;
      }

      // Validate lineup has exactly 5 starters
      if (startingLineup && startingLineup.length !== 5) {
        res.status(400).json({ error: "Starting lineup must have exactly 5 players" });
        return;
      }

      // Update team tactics if provided
      if (formation || tacticalPreset || startingLineup) {
        const updateData: any = {};
        if (formation) updateData.formation = formation;
        if (tacticalPreset) updateData.tacticalPreset = tacticalPreset;
        if (startingLineup) updateData.startingLineup = startingLineup;

        await storage.updateTeam(saveGameId, gameState.playerTeamId, updateData);
      }

      // Mark match as confirmed (ready to simulate)
      await storage.updateMatch(saveGameId, matchId, {
        preparationStatus: "confirmed",
      });

      res.json({ 
        success: true, 
        message: "Tactics confirmed. Match is ready to simulate.",
        matchId,
      });
    } catch (error) {
      console.error("Error confirming tactics:", error);
      res.status(500).json({ error: "Failed to confirm tactics" });
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
      
      await competitionEngine.updateStandings(match.competitionId, match, saveGameId);
      
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

  // Get next actionable event
  app.get("/api/game/next-event", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const nextEvent = await gameEngine.getNextEvent(saveGameId);
      if (!nextEvent) {
        res.status(404).json({ error: "No upcoming events" });
        return;
      }
      res.json(nextEvent);
    } catch (error) {
      console.error("Error getting next event:", error);
      res.status(500).json({ error: "Failed to get next event" });
    }
  });

  // Get events in date range
  app.get("/api/game/events-in-range", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({ error: "startDate and endDate are required" });
        return;
      }

      const events = await gameEngine.getEventsInRange(
        saveGameId,
        startDate as string,
        endDate as string
      );
      res.json(events);
    } catch (error) {
      console.error("Error getting events in range:", error);
      res.status(500).json({ error: "Failed to get events in range" });
    }
  });

  // Advance to next event (batch mode)
  app.post("/api/game/advance-to-event", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const nextEvent = await gameEngine.getNextEvent(saveGameId);
      
      if (!nextEvent) {
        res.status(404).json({ error: "No upcoming events" });
        return;
      }

      const gameState = await storage.getGameState(saveGameId);
      const currentDate = new Date(gameState.currentDate);
      const targetDate = new Date(nextEvent.date);
      
      // Calculate days to advance
      const daysToAdvance = Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Advance days
      let daysAdvanced = 0;
      for (let i = 0; i < daysToAdvance; i++) {
        await gameEngine.advanceOneDay(saveGameId);
        daysAdvanced++;
      }

      const updatedGameState = await storage.getGameState(saveGameId);
      
      res.json({
        daysAdvanced,
        stoppedAt: updatedGameState.currentDate,
        event: nextEvent,
        gameState: updatedGameState,
      });
    } catch (error) {
      console.error("Error advancing to event:", error);
      res.status(500).json({ error: "Failed to advance to event" });
    }
  });

  // Advance one day at a time (for stoppable advancement with animation)
  app.post("/api/game/advance-until", async (req, res) => {
    const saveGameId = requireSaveGame(req, res);
    if (saveGameId === null) return;

    try {
      const { targetDate, currentDay } = req.body;
      
      if (!targetDate) {
        res.status(400).json({ error: "targetDate is required" });
        return;
      }

      // Advance one day
      const result = await gameEngine.advanceOneDay(saveGameId);
      const gameState = await storage.getGameState(saveGameId);
      
      const target = new Date(targetDate);
      const current = new Date(gameState.currentDate);
      
      // Check if we've reached the target or encountered a match
      const complete = current >= target;
      
      // Check for next event on this day
      const nextEvent = await gameEngine.getNextEvent(saveGameId);
      const hasEventToday = nextEvent && 
        new Date(nextEvent.date).toDateString() === current.toDateString() &&
        nextEvent.type === "match";

      res.json({
        currentDate: gameState.currentDate,
        complete: complete || hasEventToday,
        nextEvent: hasEventToday ? nextEvent : undefined,
        matchesToday: result.matchesToday || [],
        gameState,
      });
    } catch (error) {
      console.error("Error in advance-until:", error);
      res.status(500).json({ error: "Failed to advance" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
