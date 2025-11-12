import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./dbStorage";
import { GameEngine } from "./gameEngine";
import { CompetitionEngine } from "./competitionEngine";
import { MatchEngine } from "./matchEngine";
import { StatisticsEngine } from "./statisticsEngine";
import { setupAuthRoutes } from "./authRoutes";
import { validateActiveSave } from "./middleware/validateSaveAccess";

// DEPRECATED: Use validateActiveSave middleware instead
// This function is kept for backward compatibility during migration
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

export async function registerRoutes(app: Express, competitionEngine?: CompetitionEngine): Promise<Server> {
  setupAuthRoutes(app, storage);
  
  // Use provided competitionEngine or create a new one
  const compEngine = competitionEngine || new CompetitionEngine(storage);

  // Deprecated: Game initialization now handled by /api/savegames POST endpoint
  // This route is no longer used and should not be called
  app.post("/api/game/initialize", async (req, res) => {
    res.status(410).json({ 
      error: "This endpoint is deprecated. Please use /api/savegames to create a new game." 
    });
  });

  app.get("/api/game/state", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const gameState = await storage.getGameState(validatedSaveId, validatedUserId);
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

  app.patch("/api/game/state", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const updated = await storage.updateGameState(validatedSaveId, validatedUserId, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update game state" });
    }
  });

  app.get("/api/team/player", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      // PERFORMANCE: Use optimized method to get just the playerTeamId without loading full game state
      const playerTeamId = await storage.getPlayerTeamId(validatedSaveId, validatedUserId);
      const team = await storage.getTeam(validatedSaveId, validatedUserId, playerTeamId);
      res.json(team);
    } catch (error) {
      console.error("Error fetching player team:", error);
      res.status(500).json({ error: "Failed to get player team" });
    }
  });

  app.get("/api/team/:id", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const team = await storage.getTeam(validatedSaveId, validatedUserId, parseInt(req.params.id));
      if (!team) {
        res.status(404).json({ error: "Team not found" });
        return;
      }
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to get team" });
    }
  });

  app.get("/api/teams/all", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const teams = await storage.getAllTeams(validatedSaveId, validatedUserId);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to get teams" });
    }
  });

  app.patch("/api/team/:id", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const updated = await storage.updateTeam(validatedSaveId, validatedUserId, parseInt(req.params.id), req.body);
      if (!updated) {
        res.status(404).json({ error: "Team not found" });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update team" });
    }
  });

  // Tactics endpoints
  app.get("/api/tactics", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const gameState = await storage.getGameState(validatedSaveId, validatedUserId);
      const team = await storage.getTeam(validatedSaveId, validatedUserId, gameState.playerTeamId);
      
      if (!team) {
        res.status(404).json({ error: "Team not found" });
        return;
      }

      // Return tactics data or default structure
      res.json(team.tactics || {
        formation: "3-1",
        assignments: {},
        substitutes: [null, null, null, null, null]
      });
    } catch (error) {
      console.error("Error getting tactics:", error);
      res.status(500).json({ error: "Failed to get tactics" });
    }
  });

  app.post("/api/tactics/save", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const gameState = await storage.getGameState(validatedSaveId, validatedUserId);
      const { formation, assignments, substitutes, instructions } = req.body;

      // Validate tactics data
      if (!formation || !assignments || !substitutes) {
        res.status(400).json({ error: "Invalid tactics data" });
        return;
      }

      // Update team with new tactics
      const updated = await storage.updateTeam(validatedSaveId, validatedUserId, gameState.playerTeamId, {
        tactics: {
          formation,
          assignments,
          substitutes,
          instructions: instructions || {
            mentality: 'Balanced',
            pressingIntensity: 'Medium',
            flyGoalkeeper: 'Never'
          }
        }
      });

      if (!updated) {
        res.status(404).json({ error: "Team not found" });
        return;
      }

      res.json({ 
        success: true, 
        tactics: updated.tactics 
      });
    } catch (error) {
      console.error("Error saving tactics:", error);
      res.status(500).json({ error: "Failed to save tactics" });
    }
  });

  app.get("/api/players", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const gameState = await storage.getGameState(validatedSaveId, validatedUserId);
      const players = await storage.getPlayersByTeam(validatedSaveId, validatedUserId, gameState.playerTeamId);
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to get players" });
    }
  });

  app.get("/api/players/:id", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const player = await storage.getPlayer(validatedSaveId, validatedUserId, parseInt(req.params.id));
      if (!player) {
        res.status(404).json({ error: "Player not found" });
        return;
      }
      res.json(player);
    } catch (error) {
      res.status(500).json({ error: "Failed to get player" });
    }
  });

  app.patch("/api/players/:id", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const updated = await storage.updatePlayer(validatedSaveId, validatedUserId, parseInt(req.params.id), req.body);
      if (!updated) {
        res.status(404).json({ error: "Player not found" });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update player" });
    }
  });

  app.get("/api/inbox", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const messages = await storage.getAllInboxMessages(validatedSaveId, validatedUserId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get inbox messages" });
    }
  });

  app.post("/api/inbox/:id/read", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const updated = await storage.updateInboxMessage(validatedSaveId, validatedUserId, parseInt(req.params.id), { read: true });
      if (!updated) {
        res.status(404).json({ error: "Message not found" });
        return;
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  app.delete("/api/inbox/:id", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const success = await storage.deleteInboxMessage(validatedSaveId, validatedUserId, parseInt(req.params.id));
      if (!success) {
        res.status(404).json({ error: "Message not found" });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  app.get("/api/club", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const club = await storage.getClub(validatedSaveId, validatedUserId);
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

  app.patch("/api/club", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const updated = await storage.updateClub(validatedSaveId, validatedUserId, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update club" });
    }
  });

  app.get("/api/competitions", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;
    const showAll = req.query.showAll === 'true';

    try {
      const gameState = await storage.getGameState(validatedSaveId, validatedUserId);
      const competitions = await storage.getAllCompetitions(validatedSaveId, validatedUserId);
      
      // Filter to only show competitions the player's team is in (unless showAll is true)
      const filteredCompetitions = showAll 
        ? competitions 
        : competitions.filter(comp => comp.teams.includes(gameState.playerTeamId));
      
      // Batch fetch all teams once to avoid N+1 query problem
      const allTeams = await storage.getAllTeams(validatedSaveId, validatedUserId);
      const teamMap = new Map(allTeams.map(team => [team.id, team.name]));
      
      // Enrich competitions with team names in standings and fixtures
      for (const competition of filteredCompetitions) {
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
      
      res.json(filteredCompetitions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get competitions" });
    }
  });

  app.get("/api/matches", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      // Optimized: Get player team ID and all matches in efficient queries
      const playerTeamId = await storage.getPlayerTeamId(validatedSaveId, validatedUserId);
      const allMatches = await storage.getAllMatchesForTeam(validatedSaveId, validatedUserId, playerTeamId);
      
      // Sort by date (most recent first) and apply pagination
      const limit = parseInt(req.query.limit as string) || 50; // Default to 50 matches
      const sortedMatches = allMatches
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
      
      res.json(sortedMatches);
    } catch (error) {
      res.status(500).json({ error: "Failed to get matches" });
    }
  });

  app.get("/api/matches/upcoming", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      // Optimized: Use efficient query to get player team matches with team names
      const playerTeamId = await storage.getPlayerTeamId(validatedSaveId, validatedUserId);
      const allMatches = await storage.getAllMatchesForTeam(validatedSaveId, validatedUserId, playerTeamId);
      
      // Filter for unplayed matches and sort by date
      const upcomingFixtures = allMatches
        .filter(match => !match.played)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      res.json(upcomingFixtures);
    } catch (error) {
      console.error("Error fetching upcoming fixtures:", error);
      res.status(500).json({ error: "Failed to get upcoming fixtures" });
    }
  });

  // Get matches on a specific date (for daily simulation)
  app.get("/api/matches/by-date", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;
    const { date } = req.query;

    try {
      if (!date || typeof date !== 'string') {
        res.status(400).json({ error: "Date parameter is required" });
        return;
      }

      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        res.status(400).json({ error: "Invalid date format" });
        return;
      }

      // Optimized: SQL-side date filtering
      const matchesOnDate = await storage.getMatchesByDate(validatedSaveId, validatedUserId, targetDate);
      
      res.json(matchesOnDate);
    } catch (error) {
      console.error("Error fetching matches by date:", error);
      res.status(500).json({ error: "Failed to get matches for date" });
    }
  });

  // Get next unplayed match requiring user action
  app.get("/api/matches/next-unplayed", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const nextMatch = await gameEngine.getNextUnplayedMatchForPlayer(validatedSaveId, validatedUserId);
      
      if (!nextMatch) {
        res.json(null);
        return;
      }

      // Enrich with team names - optimized to fetch only needed teams
      const teamIds = [nextMatch.homeTeamId, nextMatch.awayTeamId];
      const teams = await storage.getTeamsByIds(validatedSaveId, validatedUserId, teamIds);
      const teamMap = new Map(teams.map(team => [team.id, team.name]));

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
  app.get("/api/matches/:id/preparation", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const matchId = parseInt(req.params.id);
      const gameState = await storage.getGameState(validatedSaveId, validatedUserId);
      
      // Get match details
      const match = await storage.getMatch(validatedSaveId, validatedUserId, matchId);
      if (!match) {
        res.status(404).json({ error: "Match not found" });
        return;
      }

      // Get teams
      const homeTeam = await storage.getTeam(validatedSaveId, validatedUserId, match.homeTeamId);
      const awayTeam = await storage.getTeam(validatedSaveId, validatedUserId, match.awayTeamId);
      const playerTeam = await storage.getTeam(validatedSaveId, validatedUserId, gameState.playerTeamId);

      // Determine which is the opponent
      const isHome = match.homeTeamId === gameState.playerTeamId;
      const opponentTeam = isHome ? awayTeam : homeTeam;

      // Get player team squad
      const playerSquad = await storage.getPlayersByTeam(validatedSaveId, validatedUserId, gameState.playerTeamId);

      // Get opponent squad for analysis
      const opponentSquad = await storage.getPlayersByTeam(
        validatedSaveId,
        validatedUserId,
        opponentTeam!.id
      );

      // Calculate opponent team rating
      const opponentRating = opponentSquad.reduce(
        (sum, p) => sum + p.currentAbility, 
        0
      ) / opponentSquad.length;

      // Get recent matches for form
      const allMatches = await storage.getAllMatches(validatedSaveId, validatedUserId);
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
      const competition = await storage.getCompetition(validatedSaveId, validatedUserId, match.competitionId);

      const responseData = {
        match: {
          ...match,
          homeTeamName: homeTeam?.name || 'Unknown',
          awayTeamName: awayTeam?.name || 'Unknown',
          competitionName: competition?.name || 'Unknown',
        },
        playerTeam: {
          ...playerTeam,
          // Prefer tactics.formation over team.formation (tactics.formation is source of truth)
          formation: playerTeam?.tactics?.formation,
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
      };

      // Debug: Log what's being sent to client
      console.log('[Routes] Match Preparation Response:', {
        matchId,
        isHome,
        playerTeamId: playerTeam?.id,
        playerTeamName: playerTeam?.name,
        playerTeamFormation:  playerTeam?.tactics?.formation,
        playerTeamTactics: playerTeam?.tactics
      });

      res.json(responseData);
    } catch (error) {
      console.error("Error fetching match preparation data:", error);
      res.status(500).json({ error: "Failed to get match preparation data" });
    }
  });

  // Confirm tactics before match simulation
  app.post("/api/matches/:id/confirm-tactics", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const matchId = parseInt(req.params.id);
      const { formation, assignments, substitutes, instructions }: { 
        formation?: string; 
        assignments?: Record<string, number | null>; 
        substitutes?: (number | null)[];
        instructions?: {
          mentality: 'VeryDefensive' | 'Defensive' | 'Balanced' | 'Attacking' | 'VeryAttacking';
          pressingIntensity: 'Low' | 'Medium' | 'High' | 'VeryHigh';
          flyGoalkeeper: 'Never' | 'Sometimes' | 'Always';
        };
      } = req.body;

      const gameState = await storage.getGameState(validatedSaveId, validatedUserId);
      const match = await storage.getMatch(validatedSaveId, validatedUserId, matchId);

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

      // Validate lineup has exactly 5 positions filled
      if (assignments) {
        const filledPositions = Object.values(assignments).filter(id => id !== null).length;
        if (filledPositions !== 5) {
          res.status(400).json({ error: "Starting lineup must have exactly 5 players" });
          return;
        }

        // Validate goalkeeper is assigned
        if (!assignments["gk"]) {
          res.status(400).json({ error: "Starting lineup must include a goalkeeper" });
          return;
        }
      }

      // Update team tactics with new system
      if (formation || assignments || substitutes) {
        const updateData: any = {};
        
        // Save new tactics format
        if (formation && assignments && substitutes) {
          updateData.tactics = {
            formation,
            assignments,
            substitutes,
            instructions: instructions || {
              mentality: 'Balanced',
              pressingIntensity: 'Medium',
              flyGoalkeeper: 'Never'
            }
          };

          // Also update the team's formation field for display
          updateData.formation = formation;

          // Also populate startingLineup for backward compatibility with match engine
          const startingLineup = Object.values(assignments).filter((id: number | null): id is number => id !== null);
          updateData.startingLineup = startingLineup;
          
          // Populate substitutes array for backward compatibility
          const subs = substitutes.filter((id: number | null): id is number => id !== null);
          updateData.substitutes = subs;
          
          // Debug: Log what's being saved
          console.log('[Routes] Confirming tactics:', {
            matchId,
            teamId: gameState.playerTeamId,
            formation,
            instructions,
            updateData
          });
        }

        await storage.updateTeam(validatedSaveId, validatedUserId, gameState.playerTeamId, updateData);
      }

      // Mark match as confirmed (ready to simulate)
      await storage.updateMatch(validatedSaveId, validatedUserId, matchId, {
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

  app.get("/api/finances", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const transactions = await storage.getAllFinancialTransactions(validatedSaveId, validatedUserId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get financial transactions" });
    }
  });

  const gameEngine = new GameEngine(storage);
  const matchEngine = new MatchEngine(storage);

  app.post("/api/matches/:id/simulate", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const matchId = parseInt(req.params.id);
      const match = await matchEngine.simulateMatch(validatedSaveId, validatedUserId, matchId);
      
      await compEngine.updateStandings(match.competitionId, match, validatedSaveId, validatedUserId);
      
      await storage.createInboxMessage(validatedSaveId, validatedUserId, {
        category: "match",
        subject: `Match Result: ${match.homeScore} - ${match.awayScore}`,
        body: `Your match has been completed.\n\nFinal Score\n  ${match.homeScore} - ${match.awayScore} \n\nCheck the match details for full statistics.`,
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

  app.get("/api/matches/:id/post-match", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const matchId = parseInt(req.params.id);
      
      // Get match details
      const match = await storage.getMatch(validatedSaveId, validatedUserId, matchId);
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      // Get game state to find player's team
      const gameState = await storage.getGameState(validatedSaveId, validatedUserId);
      const playerTeamId = gameState.playerTeamId;

      // Get team details
      const playerTeam = await storage.getTeam(validatedSaveId, validatedUserId, playerTeamId);
      const opponentTeamId = match.homeTeamId === playerTeamId ? match.awayTeamId : match.homeTeamId;
      const opponentTeam = await storage.getTeam(validatedSaveId, validatedUserId, opponentTeamId);

      if (!playerTeam) {
        return res.status(404).json({ error: "Player team not found" });
      }

      const isHome = match.homeTeamId === playerTeamId;

      // Get competition with standings
      const competition = await storage.getCompetition(validatedSaveId, validatedUserId, match.competitionId);
      if (!competition) {
        return res.status(404).json({ error: "Competition not found" });
      }

      // Get team names for standings
      const standingsWithNames = await Promise.all(
        competition.standings.map(async (standing, index) => {
          const team = await storage.getTeam(validatedSaveId, validatedUserId, standing.teamId);
          return {
            position: index + 1,
            teamName: team?.name || 'Unknown Team',
            played: standing.played,
            won: standing.won,
            drawn: standing.drawn,
            lost: standing.lost,
            goalsFor: standing.goalsFor,
            goalsAgainst: standing.goalsAgainst,
            goalDifference: standing.goalDifference,
            points: standing.points,
            isPlayerTeam: standing.teamId === playerTeamId
          };
        })
      );

      // Get next match for player's team
      const allMatches = await storage.getMatchesByCompetition(validatedSaveId, validatedUserId, match.competitionId);
      const playerMatches = allMatches.filter(m => 
        m.homeTeamId === playerTeamId || m.awayTeamId === playerTeamId
      );
      const nextMatch = playerMatches
        .filter(m => !m.played && new Date(m.date) > new Date(match.date))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

      let nextMatchData = null;
      if (nextMatch) {
        const nextOpponentId = nextMatch.homeTeamId === playerTeamId ? nextMatch.awayTeamId : nextMatch.homeTeamId;
        const nextOpponent = await storage.getTeam(validatedSaveId, validatedUserId, nextOpponentId);
        nextMatchData = {
          id: nextMatch.id,
          opponent: nextOpponent?.name || 'Unknown',
          date: nextMatch.date,
          isHome: nextMatch.homeTeamId === playerTeamId
        };
      }

      // TODO: Get player performance stats (top scorer, top rated)
      // This would require tracking player stats in the match

      res.json({
        match: {
          id: match.id,
          homeTeamName: isHome ? playerTeam.name : opponentTeam?.name || 'Unknown',
          awayTeamName: isHome ? opponentTeam?.name || 'Unknown' : playerTeam.name,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          isHome
        },
        standings: standingsWithNames,
        nextMatch: nextMatchData
      });
    } catch (error) {
      console.error("Error fetching post-match data:", error);
      res.status(500).json({ error: "Failed to fetch post-match data" });
    }
  });

  app.post("/api/game/advance-day", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const gameState = await gameEngine.advanceOneDay(validatedSaveId, validatedUserId);
      res.json(gameState);
    } catch (error) {
      console.error("Error advancing day:", error);
      res.status(500).json({ error: "Failed to advance day" });
    }
  });

  app.post("/api/game/advance-days", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const { days } = req.body;
      const gameState = await gameEngine.advanceDays(validatedSaveId, validatedUserId, days);
      res.json(gameState);
    } catch (error) {
      console.error("Error advancing days:", error);
      res.status(500).json({ error: "Failed to advance days" });
    }
  });

  app.post("/api/game/advance-to-date", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const { date } = req.body;
      const gameState = await gameEngine.advanceToDate(validatedSaveId, validatedUserId, new Date(date));
      res.json(gameState);
    } catch (error) {
      console.error("Error advancing to date:", error);
      res.status(500).json({ error: "Failed to advance to date" });
    }
  });

  // Get next actionable event
  app.get("/api/game/next-event", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const nextEvent = await gameEngine.getNextEvent(validatedSaveId, validatedUserId);
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
  app.get("/api/game/events-in-range", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({ error: "startDate and endDate are required" });
        return;
      }

      const events = await gameEngine.getEventsInRange(
        validatedSaveId,
        validatedUserId,
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
  app.post("/api/game/advance-to-event", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const nextEvent = await gameEngine.getNextEvent(validatedSaveId, validatedUserId);
      
      if (!nextEvent) {
        res.status(404).json({ error: "No upcoming events" });
        return;
      }

      const gameState = await storage.getGameState(validatedSaveId, validatedUserId);
      const currentDate = new Date(gameState.currentDate);
      const targetDate = new Date(nextEvent.date);
      
      // Calculate days to advance
      const daysToAdvance = Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Advance days
      let daysAdvanced = 0;
      for (let i = 0; i < daysToAdvance; i++) {
        await gameEngine.advanceOneDay(validatedSaveId, validatedUserId);
        daysAdvanced++;
      }

      const updatedGameState = await storage.getGameState(validatedSaveId, validatedUserId);
      
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
  app.post("/api/game/advance-until", validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;

    try {
      const { targetDate, currentDay } = req.body;
      
      if (!targetDate) {
        res.status(400).json({ error: "targetDate is required" });
        return;
      }

      // Advance one day
      const result = await gameEngine.advanceOneDay(validatedSaveId, validatedUserId);
      const gameState = await storage.getGameState(validatedSaveId, validatedUserId);
      
      const target = new Date(targetDate);
      const current = new Date(gameState.currentDate);
      
      // Check if we've reached the target or encountered a match
      const complete = current >= target;
      
      // Check for next event on this day
      const nextEvent = await gameEngine.getNextEvent(validatedSaveId, validatedUserId);
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

  // Statistics routes
  const statisticsEngine = new StatisticsEngine(storage);

  app.get('/api/statistics/top-scorers/:competitionId', validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;
    try {
      const { competitionId } = req.params;
      const { limit = '10' } = req.query;
      
      const topScorers = await statisticsEngine.getTopScorers(
        validatedSaveId,
        validatedUserId,
        parseInt(competitionId),
        parseInt(limit as string)
      );
      
      res.json(topScorers);
    } catch (error) {
      console.error('Error fetching top scorers:', error);
      res.status(500).json({ error: 'Failed to fetch top scorers' });
    }
  });

  app.get('/api/statistics/top-assisters/:competitionId', validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;
    try {
      const { competitionId } = req.params;
      const { limit = '10' } = req.query;
      
      const topAssisters = await statisticsEngine.getTopAssisters(
        validatedSaveId,
        validatedUserId,
        parseInt(competitionId),
        parseInt(limit as string)
      );
      
      res.json(topAssisters);
    } catch (error) {
      console.error('Error fetching top assisters:', error);
      res.status(500).json({ error: 'Failed to fetch top assisters' });
    }
  });

  app.get('/api/statistics/clean-sheets/:competitionId', validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;
    try {
      const { competitionId } = req.params;
      const { limit = '10' } = req.query;
      
      const topCleanSheets = await statisticsEngine.getTopCleanSheets(
        validatedSaveId,
        validatedUserId,
        parseInt(competitionId),
        parseInt(limit as string)
      );
      
      res.json(topCleanSheets);
    } catch (error) {
      console.error('Error fetching clean sheets:', error);
      res.status(500).json({ error: 'Failed to fetch clean sheets' });
    }
  });

  app.get('/api/statistics/discipline/:competitionId', validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;
    try {
      const { competitionId } = req.params;
      
      const disciplineStats = await statisticsEngine.getDisciplineStats(
        validatedSaveId,
        validatedUserId,
        parseInt(competitionId)
      );
      
      res.json(disciplineStats);
    } catch (error) {
      console.error('Error fetching discipline stats:', error);
      res.status(500).json({ error: 'Failed to fetch discipline stats' });
    }
  });

  app.get('/api/statistics/form/:teamId', validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;
    try {
      const { teamId } = req.params;
      const { competitionId } = req.query;
      
      const form = await statisticsEngine.getTeamForm(
        validatedSaveId,
        validatedUserId,
        parseInt(teamId),
        competitionId ? parseInt(competitionId as string) : undefined
      );
      
      res.json(form);
    } catch (error) {
      console.error('Error fetching team form:', error);
      res.status(500).json({ error: 'Failed to fetch team form' });
    }
  });

  app.get('/api/statistics/player/:playerId', validateActiveSave, async (req, res) => {
    const { validatedSaveId, validatedUserId } = res.locals;
    try {
      const { playerId } = req.params;
      
      const player = await storage.getPlayer(
        validatedSaveId,
        validatedUserId,
        parseInt(playerId)
      );

      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }
      
      res.json({
        seasonStats: player.seasonStats,
        competitionStats: player.competitionStats,
        careerStats: player.careerStats,
      });
    } catch (error) {
      console.error('Error fetching player statistics:', error);
      res.status(500).json({ error: 'Failed to fetch player statistics' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
