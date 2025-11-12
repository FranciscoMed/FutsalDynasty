import { db } from "./db";
import {
  type Player,
  type Team,
  type Match,
  type Competition,
  type TransferOffer,
  type InboxMessage,
  type FinancialTransaction,
  type Club,
  type GameState,
  type User,
  type SaveGame,
  type PlayerAttributes,
  calculateOverallRating,
  players,
  teams,
  matches,
  competitions,
  transferOffers,
  inboxMessages,
  financialTransactions,
  clubs,
  gameStates,
  users,
  saveGames,
} from "@shared/schema";
import { eq, desc, and, inArray, or, gte, lt, sql } from "drizzle-orm";
import type { IStorage } from "./storage";

export class DbStorage implements IStorage {
  // Player methods with userId security
  async getPlayer(saveGameId: number, userId: number, id: number): Promise<Player | undefined> {
    const result = await db.select().from(players)
      .where(and(
        eq(players.saveGameId, saveGameId),
        eq(players.userId, userId),
        eq(players.id, id)
      ))
      .limit(1);
    return result[0] as Player | undefined;
  }

  async getAllPlayers(saveGameId: number, userId: number): Promise<Player[]> {
    const result = await db.select().from(players)
      .where(and(
        eq(players.saveGameId, saveGameId),
        eq(players.userId, userId)
      ));
    return result as Player[];
  }

  async getPlayersByTeam(saveGameId: number, userId: number, teamId: number): Promise<Player[]> {
    const result = await db.select().from(players)
      .where(and(
        eq(players.saveGameId, saveGameId),
        eq(players.userId, userId),
        eq(players.teamId, teamId)
      ));
    return result as Player[];
  }

  async createPlayer(saveGameId: number, userId: number, player: Omit<Player, "id" | "userId" | "saveGameId">): Promise<Player> {
    const result = await db.insert(players)
      .values({ ...player, saveGameId, userId })
      .returning();
    return result[0] as Player;
  }

  async updatePlayer(saveGameId: number, userId: number, id: number, player: Partial<Player>): Promise<Player | undefined> {
    const result = await db.update(players)
      .set(player)
      .where(and(
        eq(players.saveGameId, saveGameId),
        eq(players.userId, userId),
        eq(players.id, id)
      ))
      .returning();
    return result[0] as Player | undefined;
  }

  // Team methods with userId security
  async getTeam(saveGameId: number, userId: number, id: number): Promise<Team | undefined> {
    const result = await db.select().from(teams)
      .where(and(
        eq(teams.saveGameId, saveGameId),
        eq(teams.userId, userId),
        eq(teams.id, id)
      ))
      .limit(1);
    return result[0] as Team | undefined;
  }

  async getAllTeams(saveGameId: number, userId: number): Promise<Team[]> {
    const result = await db.select().from(teams)
      .where(and(
        eq(teams.saveGameId, saveGameId),
        eq(teams.userId, userId)
      ));
    return result as Team[];
  }

  async getTeamsByIds(saveGameId: number, userId: number, ids: number[]): Promise<Team[]> {
    if (ids.length === 0) return [];
    const result = await db.select().from(teams)
      .where(and(
        eq(teams.saveGameId, saveGameId),
        eq(teams.userId, userId),
        inArray(teams.id, ids)
      ));
    return result as Team[];
  }

  async createTeam(saveGameId: number, userId: number, team: Omit<Team, "id" | "userId" | "saveGameId">): Promise<Team> {
    const result = await db.insert(teams)
      .values({ ...team, saveGameId, userId })
      .returning();
    return result[0] as Team;
  }

  async updateTeam(saveGameId: number, userId: number, id: number, team: Partial<Team>): Promise<Team | undefined> {
    const result = await db.update(teams)
      .set(team)
      .where(and(
        eq(teams.saveGameId, saveGameId),
        eq(teams.userId, userId),
        eq(teams.id, id)
      ))
      .returning();
    return result[0] as Team | undefined;
  }

  // Match methods with userId security
  async getMatch(saveGameId: number, userId: number, id: number): Promise<Match | undefined> {
    const result = await db.select().from(matches)
      .where(and(
        eq(matches.saveGameId, saveGameId),
        eq(matches.userId, userId),
        eq(matches.id, id)
      ))
      .limit(1);
    return result[0] as Match | undefined;
  }

  async getAllMatches(saveGameId: number, userId: number): Promise<Match[]> {
    const result = await db.select().from(matches)
      .where(and(
        eq(matches.saveGameId, saveGameId),
        eq(matches.userId, userId)
      ));
    return result as Match[];
  }

  async getMatchesByCompetition(saveGameId: number, userId: number, competitionId: number): Promise<Match[]> {
    const result = await db.select().from(matches)
      .where(and(
        eq(matches.saveGameId, saveGameId),
        eq(matches.userId, userId),
        eq(matches.competitionId, competitionId)
      ));
    return result as Match[];
  }

  async getMatchesByDate(saveGameId: number, userId: number, date: Date): Promise<Array<Match & { competitionId: number, competitionName: string, competitionType: string, homeTeamName: string, awayTeamName: string }>> {
    // Normalize date to midnight UTC for accurate comparison
    const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const nextDay = new Date(targetDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    // Efficiently fetch all matches on a specific date with competition details
    const matchResults = await db
      .select({
        id: matches.id,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        date: matches.date,
        played: matches.played,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        events: matches.events,
        preparationStatus: matches.preparationStatus,
        homeStats: matches.homeStats,
        awayStats: matches.awayStats,
        playerRatings: matches.playerRatings,
        userId: matches.userId,
        saveGameId: matches.saveGameId,
        competitionId: competitions.id,
        competitionName: competitions.name,
        competitionType: competitions.type,
        matchCompetitionId: matches.competitionId,
        matchCompetitionType: matches.competitionType,
      })
      .from(matches)
      .innerJoin(competitions, eq(matches.competitionId, competitions.id))
      .where(
        and(
          eq(matches.saveGameId, saveGameId),
          eq(matches.userId, userId),
          gte(matches.date, targetDate),
          lt(matches.date, nextDay)
        )
      );

    // If no matches found, return empty array
    if (matchResults.length === 0) {
      return [];
    }

    // Get unique team IDs
    const teamIds = new Set<number>();
    matchResults.forEach(match => {
      teamIds.add(match.homeTeamId);
      teamIds.add(match.awayTeamId);
    });

    // Fetch all teams in one query
    const teamsList = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.saveGameId, saveGameId),
          eq(teams.userId, userId),
          inArray(teams.id, Array.from(teamIds))
        )
      );

    // Create a map for quick team name lookup
    const teamMap = new Map(teamsList.map(team => [team.id, team.name]));

    // Combine the data
    return matchResults.map(row => ({
      id: row.id,
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      date: row.date,
      played: row.played,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      events: row.events,
      preparationStatus: row.preparationStatus,
      homeStats: row.homeStats,
      awayStats: row.awayStats,
      playerRatings: row.playerRatings,
      userId: row.userId,
      saveGameId: row.saveGameId,
      competitionId: row.competitionId,
      competitionName: row.competitionName,
      competitionType: row.competitionType,
      homeTeamName: teamMap.get(row.homeTeamId) || 'Unknown',
      awayTeamName: teamMap.get(row.awayTeamId) || 'Unknown',
    }));
  }

  async getUnplayedMatchesForTeam(saveGameId: number, userId: number, teamId: number): Promise<Array<Match & { competitionId: number, competitionName: string, competitionType: string }>> {
    // Efficiently fetch unplayed matches for a team using SQL OR in WHERE clause
    const teamMatches = await db
      .select({
        id: matches.id,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        date: matches.date,
        played: matches.played,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        events: matches.events,
        preparationStatus: matches.preparationStatus,
        homeStats: matches.homeStats,
        awayStats: matches.awayStats,
        playerRatings: matches.playerRatings,
        userId: matches.userId,
        saveGameId: matches.saveGameId,
        competitionId: competitions.id,
        competitionName: competitions.name,
        competitionType: competitions.type,
        matchCompetitionId: matches.competitionId,
        matchCompetitionType: matches.competitionType,
      })
      .from(matches)
      .innerJoin(competitions, eq(matches.competitionId, competitions.id))
      .where(
        and(
          eq(matches.saveGameId, saveGameId),
          eq(matches.userId, userId),
          eq(matches.played, false),
          or(
            eq(matches.homeTeamId, teamId),
            eq(matches.awayTeamId, teamId)
          )
        )
      );
    
    // Map to proper type
    return teamMatches.map(match => ({
      id: match.id,
      userId: match.userId,
      saveGameId: match.saveGameId,
      competitionId: match.matchCompetitionId,
      competitionType: match.matchCompetitionType,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      date: match.date,
      played: match.played,
      preparationStatus: match.preparationStatus,
      events: match.events,
      homeStats: match.homeStats,
      awayStats: match.awayStats,
      playerRatings: match.playerRatings,
      competitionName: match.competitionName,
    })) as Array<Match & { competitionId: number, competitionName: string, competitionType: string }>;
  }

  async createMatch(saveGameId: number, userId: number, match: Omit<Match, "id" | "userId" | "saveGameId">): Promise<Match> {
    const result = await db.insert(matches)
      .values({ ...match, saveGameId, userId })
      .returning();
    return result[0] as Match;
  }

  async updateMatch(saveGameId: number, userId: number, id: number, match: Partial<Match>): Promise<Match | undefined> {
    const result = await db.update(matches)
      .set(match)
      .where(and(
        eq(matches.saveGameId, saveGameId),
        eq(matches.userId, userId),
        eq(matches.id, id)
      ))
      .returning();
    return result[0] as Match | undefined;
  }

  async getAllMatchesForTeam(saveGameId: number, userId: number, teamId: number): Promise<Array<Match & { competitionId: number, competitionName: string, competitionType: string, homeTeamName: string, awayTeamName: string }>> {
    // Efficiently fetch matches for a team with competition details using SQL OR in WHERE clause
    const teamMatches = await db
      .select({
        id: matches.id,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        date: matches.date,
        played: matches.played,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        events: matches.events,
        preparationStatus: matches.preparationStatus,
        homeStats: matches.homeStats,
        awayStats: matches.awayStats,
        playerRatings: matches.playerRatings,
        userId: matches.userId,
        saveGameId: matches.saveGameId,
        competitionId: competitions.id,
        competitionName: competitions.name,
        competitionType: competitions.type,
        matchCompetitionId: matches.competitionId,
        matchCompetitionType: matches.competitionType,
      })
      .from(matches)
      .innerJoin(competitions, eq(matches.competitionId, competitions.id))
      .where(
        and(
          eq(matches.saveGameId, saveGameId),
          eq(matches.userId, userId),
          or(
            eq(matches.homeTeamId, teamId),
            eq(matches.awayTeamId, teamId)
          )
        )
      );

    // Get unique team IDs from matches
    const teamIds = new Set<number>();
    teamMatches.forEach(match => {
      teamIds.add(match.homeTeamId);
      teamIds.add(match.awayTeamId);
    });

    // Fetch only the needed teams
    const teams = await this.getTeamsByIds(saveGameId, userId, Array.from(teamIds));
    const teamMap = new Map(teams.map(team => [team.id, team.name]));
    
    // Map to proper type with team names
    return teamMatches.map(match => ({
      id: match.id,
      userId: match.userId,
      saveGameId: match.saveGameId,
      competitionId: match.matchCompetitionId,
      competitionType: match.matchCompetitionType,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      date: match.date,
      played: match.played,
      preparationStatus: match.preparationStatus,
      events: match.events,
      homeStats: match.homeStats,
      awayStats: match.awayStats,
      playerRatings: match.playerRatings,
      competitionName: match.competitionName,
      homeTeamName: teamMap.get(match.homeTeamId) || 'Unknown',
      awayTeamName: teamMap.get(match.awayTeamId) || 'Unknown',
    })) as Array<Match & { competitionId: number, competitionName: string, competitionType: string, homeTeamName: string, awayTeamName: string }>;
  }

  // Competition methods with userId security
  async getCompetition(saveGameId: number, userId: number, id: number): Promise<Competition | undefined> {
    const result = await db.select().from(competitions)
      .where(and(
        eq(competitions.saveGameId, saveGameId),
        eq(competitions.userId, userId),
        eq(competitions.id, id)
      ))
      .limit(1);
    if (!result[0]) return undefined;
    
    const comp = result[0];
    const compMatches = await this.getMatchesByCompetition(saveGameId, userId, id);
    
    return {
      id: comp.id,
      name: comp.name,
      type: comp.type,
      season: comp.season,
      teams: comp.teams,
      fixtures: compMatches,
      standings: comp.standings,
      currentMatchday: comp.currentMatchday,
      totalMatchdays: comp.totalMatchdays,
    } as Competition;
  }

  async getAllCompetitions(saveGameId: number, userId: number): Promise<Competition[]> {
    // Fetch all competitions first
    const result = await db.select().from(competitions)
      .where(and(
        eq(competitions.saveGameId, saveGameId),
        eq(competitions.userId, userId)
      ));
    
    if (result.length === 0) {
      return [];
    }
    
    // Fetch ALL matches for this save game at once (much faster than N+1 queries)
    const allMatches = await db.select().from(matches)
      .where(and(
        eq(matches.saveGameId, saveGameId),
        eq(matches.userId, userId)
      ));
    
    // Group matches by competition ID
    const matchesByCompetition = new Map<number, Match[]>();
    for (const match of allMatches) {
      const compMatches = matchesByCompetition.get(match.competitionId) || [];
      compMatches.push(match as Match);
      matchesByCompetition.set(match.competitionId, compMatches);
    }
    
    // Build competitions with their matches
    const comps: Competition[] = result.map(comp => ({
      id: comp.id,
      name: comp.name,
      type: comp.type,
      season: comp.season,
      teams: comp.teams,
      fixtures: matchesByCompetition.get(comp.id) || [],
      standings: comp.standings,
      currentMatchday: comp.currentMatchday,
      totalMatchdays: comp.totalMatchdays,
    } as Competition));
    
    return comps;
  }

  async createCompetition(saveGameId: number, userId: number, competition: Omit<Competition, "id" | "userId" | "saveGameId">): Promise<Competition> {
    const { fixtures, ...compData } = competition;
    const result = await db.insert(competitions)
      .values({ ...compData, saveGameId, userId })
      .returning();
    const created = result[0];
    
    for (const match of fixtures) {
      await this.createMatch(saveGameId, userId, { ...match, competitionId: created.id });
    }
    
    return await this.getCompetition(saveGameId, userId, created.id) as Competition;
  }

  async updateCompetition(saveGameId: number, userId: number, id: number, competition: Partial<Competition>): Promise<Competition | undefined> {
    const { fixtures, ...compData } = competition;
    await db.update(competitions)
      .set(compData)
      .where(and(
        eq(competitions.saveGameId, saveGameId),
        eq(competitions.userId, userId),
        eq(competitions.id, id)
      ));
    return await this.getCompetition(saveGameId, userId, id);
  }

  // Transfer offer methods with userId security
  async getTransferOffer(saveGameId: number, userId: number, id: number): Promise<TransferOffer | undefined> {
    const result = await db.select().from(transferOffers)
      .where(and(
        eq(transferOffers.saveGameId, saveGameId),
        eq(transferOffers.userId, userId),
        eq(transferOffers.id, id)
      ))
      .limit(1);
    return result[0] as TransferOffer | undefined;
  }

  async getAllTransferOffers(saveGameId: number, userId: number): Promise<TransferOffer[]> {
    const result = await db.select().from(transferOffers)
      .where(and(
        eq(transferOffers.saveGameId, saveGameId),
        eq(transferOffers.userId, userId)
      ));
    return result as TransferOffer[];
  }

  async getTransferOffersByTeam(saveGameId: number, userId: number, teamId: number): Promise<TransferOffer[]> {
    const result = await db.select().from(transferOffers)
      .where(and(
        eq(transferOffers.saveGameId, saveGameId),
        eq(transferOffers.userId, userId)
      ));
    return (result as TransferOffer[]).filter(
      o => o.toTeamId === teamId || o.fromTeamId === teamId
    );
  }

  async createTransferOffer(saveGameId: number, userId: number, offer: Omit<TransferOffer, "id" | "userId" | "saveGameId">): Promise<TransferOffer> {
    const result = await db.insert(transferOffers)
      .values({ ...offer, saveGameId, userId })
      .returning();
    return result[0] as TransferOffer;
  }

  async updateTransferOffer(saveGameId: number, userId: number, id: number, offer: Partial<TransferOffer>): Promise<TransferOffer | undefined> {
    const result = await db.update(transferOffers)
      .set(offer)
      .where(and(
        eq(transferOffers.saveGameId, saveGameId),
        eq(transferOffers.userId, userId),
        eq(transferOffers.id, id)
      ))
      .returning();
    return result[0] as TransferOffer | undefined;
  }

  // Inbox message methods with userId security
  async getInboxMessage(saveGameId: number, userId: number, id: number): Promise<InboxMessage | undefined> {
    const result = await db.select().from(inboxMessages)
      .where(and(
        eq(inboxMessages.saveGameId, saveGameId),
        eq(inboxMessages.userId, userId),
        eq(inboxMessages.id, id)
      ))
      .limit(1);
    return result[0] as InboxMessage | undefined;
  }

  async getAllInboxMessages(saveGameId: number, userId: number): Promise<InboxMessage[]> {
    const result = await db.select().from(inboxMessages)
      .where(and(
        eq(inboxMessages.saveGameId, saveGameId),
        eq(inboxMessages.userId, userId)
      ))
      .orderBy(desc(inboxMessages.date));
    return result as InboxMessage[];
  }

  async createInboxMessage(saveGameId: number, userId: number, message: Omit<InboxMessage, "id" | "userId" | "saveGameId">): Promise<InboxMessage> {
    const result = await db.insert(inboxMessages)
      .values({ ...message, saveGameId, userId })
      .returning();
    return result[0] as InboxMessage;
  }

  async updateInboxMessage(saveGameId: number, userId: number, id: number, message: Partial<InboxMessage>): Promise<InboxMessage | undefined> {
    const result = await db.update(inboxMessages)
      .set(message)
      .where(and(
        eq(inboxMessages.saveGameId, saveGameId),
        eq(inboxMessages.userId, userId),
        eq(inboxMessages.id, id)
      ))
      .returning();
    return result[0] as InboxMessage | undefined;
  }

  async deleteInboxMessage(saveGameId: number, userId: number, id: number): Promise<boolean> {
    await db.delete(inboxMessages)
      .where(and(
        eq(inboxMessages.saveGameId, saveGameId),
        eq(inboxMessages.userId, userId),
        eq(inboxMessages.id, id)
      ));
    return true;
  }

  // Financial transaction methods with userId security
  async getFinancialTransaction(saveGameId: number, userId: number, id: number): Promise<FinancialTransaction | undefined> {
    const result = await db.select().from(financialTransactions)
      .where(and(
        eq(financialTransactions.saveGameId, saveGameId),
        eq(financialTransactions.userId, userId),
        eq(financialTransactions.id, id)
      ))
      .limit(1);
    return result[0] as FinancialTransaction | undefined;
  }

  async getAllFinancialTransactions(saveGameId: number, userId: number): Promise<FinancialTransaction[]> {
    const result = await db.select().from(financialTransactions)
      .where(and(
        eq(financialTransactions.saveGameId, saveGameId),
        eq(financialTransactions.userId, userId)
      ))
      .orderBy(desc(financialTransactions.date));
    return result as FinancialTransaction[];
  }

  async createFinancialTransaction(saveGameId: number, userId: number, transaction: Omit<FinancialTransaction, "id" | "userId" | "saveGameId">): Promise<FinancialTransaction> {
    const result = await db.insert(financialTransactions)
      .values({ ...transaction, saveGameId, userId })
      .returning();
    return result[0] as FinancialTransaction;
  }

  // Club methods with userId security
  async getClub(saveGameId: number, userId: number): Promise<Club | undefined> {
    const result = await db.select().from(clubs)
      .where(and(
        eq(clubs.saveGameId, saveGameId),
        eq(clubs.userId, userId)
      ))
      .limit(1);
    return result[0] as Club | undefined;
  }

  async updateClub(saveGameId: number, userId: number, club: Partial<Club>): Promise<Club | undefined> {
    const existing = await this.getClub(saveGameId, userId);
    if (!existing) return undefined;
    const result = await db.update(clubs)
      .set(club)
      .where(and(
        eq(clubs.saveGameId, saveGameId),
        eq(clubs.userId, userId),
        eq(clubs.id, existing.id)
      ))
      .returning();
    return result[0] as Club | undefined;
  }

  async createClub(saveGameId: number, userId: number, club: Omit<Club, "id" | "userId" | "saveGameId">): Promise<Club> {
    const result = await db.insert(clubs)
      .values({ ...club, saveGameId, userId })
      .returning();
    return result[0] as Club;
  }

  // GameState methods with userId security
  async getGameState(saveGameId: number, userId: number): Promise<GameState> {
    const result = await db.select().from(gameStates)
      .where(and(
        eq(gameStates.saveGameId, saveGameId),
        eq(gameStates.userId, userId)
      ))
      .limit(1);
    if (!result[0]) {
      throw new Error("Game state not found");
    }
    
    const state = result[0];
    // PERFORMANCE: Don't load competitions here - they're fetched separately via /api/competitions
    // This was causing 10+ second delays on every game state request
    
    return {
      currentDate: state.currentDate,
      season: state.season,
      currentMonth: state.currentMonth,
      playerTeamId: state.playerTeamId,
      competitions: [], // Empty array - frontend uses /api/competitions endpoint
      nextMatchId: state.nextMatchId,
      monthlyTrainingInProgress: state.monthlyTrainingInProgress,
      lastTrainingReportMonth: state.lastTrainingReportMonth,
    };
  }

  // Fast method to get just the player team ID without loading full game state
  async getPlayerTeamId(saveGameId: number, userId: number): Promise<number> {
    const result = await db.select({ playerTeamId: gameStates.playerTeamId })
      .from(gameStates)
      .where(and(
        eq(gameStates.saveGameId, saveGameId),
        eq(gameStates.userId, userId)
      ))
      .limit(1);
    if (!result[0]) {
      throw new Error("Game state not found");
    }
    return result[0].playerTeamId;
  }

  async updateGameState(saveGameId: number, userId: number, state: Partial<GameState>): Promise<GameState> {
    const existing = await db.select().from(gameStates)
      .where(and(
        eq(gameStates.saveGameId, saveGameId),
        eq(gameStates.userId, userId)
      ))
      .limit(1);
    if (!existing[0]) {
      throw new Error("Game state not found");
    }
    
    const { competitions, ...stateData } = state;
    await db.update(gameStates)
      .set(stateData)
      .where(and(
        eq(gameStates.saveGameId, saveGameId),
        eq(gameStates.userId, userId),
        eq(gameStates.id, existing[0].id)
      ));
    return await this.getGameState(saveGameId, userId);
  }

  async createGameState(saveGameId: number, userId: number, state: Omit<GameState, "id" | "userId" | "saveGameId">): Promise<GameState> {
    const { competitions, ...stateData } = state;
    const result = await db.insert(gameStates)
      .values({ ...stateData, saveGameId, userId })
      .returning();
    return await this.getGameState(saveGameId, userId);
  }

  // User methods - no userId filtering needed (users manage themselves)
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] as User | undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] as User | undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] as User | undefined;
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0] as User;
  }

  async getSaveGame(id: number): Promise<SaveGame | undefined> {
    const result = await db.select().from(saveGames).where(eq(saveGames.id, id)).limit(1);
    return result[0] as SaveGame | undefined;
  }

  async getSaveGamesByUser(userId: number): Promise<SaveGame[]> {
    const result = await db.select().from(saveGames).where(eq(saveGames.userId, userId)).orderBy(desc(saveGames.updatedAt));
    return result as SaveGame[];
  }

  async createSaveGame(saveGame: Omit<SaveGame, "id">): Promise<SaveGame> {
    const result = await db.insert(saveGames).values(saveGame).returning();
    return result[0] as SaveGame;
  }

  async updateSaveGame(id: number, saveGame: Partial<SaveGame>): Promise<SaveGame | undefined> {
    const result = await db.update(saveGames).set({ ...saveGame, updatedAt: new Date() }).where(eq(saveGames.id, id)).returning();
    return result[0] as SaveGame | undefined;
  }

  async deleteSaveGame(id: number): Promise<boolean> {
    const saveGame = await this.getSaveGame(id);
    if (saveGame) {
      await this.cleanupSaveGameData(id);
    }
    await db.delete(saveGames).where(eq(saveGames.id, id));
    return true;
  }

  async cleanupSaveGameData(saveGameId: number): Promise<{ deletedRecords: number }> {
    let deletedCount = 0;

    const playersDeleted = await db.delete(players).where(eq(players.saveGameId, saveGameId));
    deletedCount += playersDeleted.rowCount || 0;

    const matchesDeleted = await db.delete(matches).where(eq(matches.saveGameId, saveGameId));
    deletedCount += matchesDeleted.rowCount || 0;

    const competitionsDeleted = await db.delete(competitions).where(eq(competitions.saveGameId, saveGameId));
    deletedCount += competitionsDeleted.rowCount || 0;

    const teamsDeleted = await db.delete(teams).where(eq(teams.saveGameId, saveGameId));
    deletedCount += teamsDeleted.rowCount || 0;

    const transferOffersDeleted = await db.delete(transferOffers).where(eq(transferOffers.saveGameId, saveGameId));
    deletedCount += transferOffersDeleted.rowCount || 0;

    const inboxMessagesDeleted = await db.delete(inboxMessages).where(eq(inboxMessages.saveGameId, saveGameId));
    deletedCount += inboxMessagesDeleted.rowCount || 0;

    const financialTransactionsDeleted = await db.delete(financialTransactions).where(eq(financialTransactions.saveGameId, saveGameId));
    deletedCount += financialTransactionsDeleted.rowCount || 0;

    const clubsDeleted = await db.delete(clubs).where(eq(clubs.saveGameId, saveGameId));
    deletedCount += clubsDeleted.rowCount || 0;

    const gameStatesDeleted = await db.delete(gameStates).where(eq(gameStates.saveGameId, saveGameId));
    deletedCount += gameStatesDeleted.rowCount || 0;

    console.log(`Cleaned up ${deletedCount} records for saveGameId ${saveGameId}`);

    return { deletedRecords: deletedCount };
  }

  async findOrphanedSaveGameIds(): Promise<number[]> {
    const allSaveGameIds = new Set<number>();

    const playerIds = await db.selectDistinct({ saveGameId: players.saveGameId }).from(players);
    playerIds.forEach(p => p.saveGameId && allSaveGameIds.add(p.saveGameId));

    const teamIds = await db.selectDistinct({ saveGameId: teams.saveGameId }).from(teams);
    teamIds.forEach(t => t.saveGameId && allSaveGameIds.add(t.saveGameId));

    const matchIds = await db.selectDistinct({ saveGameId: matches.saveGameId }).from(matches);
    matchIds.forEach(m => m.saveGameId && allSaveGameIds.add(m.saveGameId));

    const competitionIds = await db.selectDistinct({ saveGameId: competitions.saveGameId }).from(competitions);
    competitionIds.forEach(c => c.saveGameId && allSaveGameIds.add(c.saveGameId));

    const transferOfferIds = await db.selectDistinct({ saveGameId: transferOffers.saveGameId }).from(transferOffers);
    transferOfferIds.forEach(t => t.saveGameId && allSaveGameIds.add(t.saveGameId));

    const inboxMessageIds = await db.selectDistinct({ saveGameId: inboxMessages.saveGameId }).from(inboxMessages);
    inboxMessageIds.forEach(i => i.saveGameId && allSaveGameIds.add(i.saveGameId));

    const financialTransactionIds = await db.selectDistinct({ saveGameId: financialTransactions.saveGameId }).from(financialTransactions);
    financialTransactionIds.forEach(f => f.saveGameId && allSaveGameIds.add(f.saveGameId));

    const clubIds = await db.selectDistinct({ saveGameId: clubs.saveGameId }).from(clubs);
    clubIds.forEach(c => c.saveGameId && allSaveGameIds.add(c.saveGameId));

    const gameStateIds = await db.selectDistinct({ saveGameId: gameStates.saveGameId }).from(gameStates);
    gameStateIds.forEach(g => g.saveGameId && allSaveGameIds.add(g.saveGameId));

    const validSaveGames = await db.select({ id: saveGames.id }).from(saveGames);
    const validSaveGameIds = new Set(validSaveGames.map(sg => sg.id));

    const orphanedIds = Array.from(allSaveGameIds).filter(id => !validSaveGameIds.has(id));

    console.log(`Found ${orphanedIds.length} orphaned saveGameIds: ${orphanedIds.join(', ')}`);

    return orphanedIds;
  }

  // Game initialization with userId for security
  async initializeGame(saveGameId: number, userId: number): Promise<void> {
    const existingState = await db.select().from(gameStates).limit(1);
    if (existingState.length > 0) {
      console.log("Game already initialized");
      return;
    }

    const playerTeam = await this.createTeam(saveGameId, userId, {
      name: "FC United",
      abbreviation: "FCU",
      reputation: 50,
      budget: 500000,
      wageBudget: 50000,
      stadium: "Unity Stadium",
      formation: "2-2",
      tacticalPreset: "Balanced",
      startingLineup: [],
      substitutes: [],
      isPlayerTeam: true,
    });

    await db.insert(clubs).values({
      saveGameId,
      userId,
      name: playerTeam.name,
      stadium: playerTeam.stadium,
      reputation: playerTeam.reputation,
      budget: playerTeam.budget,
      wageBudget: playerTeam.wageBudget,
      trainingFacilityLevel: 3,
      stadiumCapacity: 5000,
      youthAcademyLevel: 2,
      staff: {
        assistantCoach: true,
        fitnessCoach: false,
        scout: false,
      },
      boardObjectives: [
        {
          description: "Finish in top half of league",
          target: "Top 6",
          importance: "high" as const,
          completed: false,
        },
        {
          description: "Reach cup quarter-finals",
          target: "Quarter-Finals",
          importance: "medium" as const,
          completed: false,
        },
      ],
    });

    const playerNames = [
      "Martinez", "Silva", "Rodriguez", "Costa", "Fernandez",
      "Santos", "Oliveira", "Pereira", "Sousa", "Alves",
      "Ribeiro", "Carvalho", "Ferreira", "Gomes", "Lopes"
    ];

    for (let i = 0; i < 15; i++) {
      const position: "Goalkeeper" | "Defender" | "Winger" | "Pivot" = 
        i === 0 ? "Goalkeeper" :
        i === 1 ? "Goalkeeper" :
        i < 6 ? "Defender" :
        i < 10 ? "Winger" : "Pivot";

      const baseRating = 100 + Math.floor(Math.random() * 60);
      const potential = baseRating + Math.floor(Math.random() * 40) + 20;
      const age = 18 + Math.floor(Math.random() * 14);

      const attributes: PlayerAttributes = {
        shooting: baseRating + Math.floor(Math.random() * 30) - 15,
        passing: baseRating + Math.floor(Math.random() * 30) - 15,
        dribbling: baseRating + Math.floor(Math.random() * 30) - 15,
        ballControl: baseRating + Math.floor(Math.random() * 30) - 15,
        firstTouch: baseRating + Math.floor(Math.random() * 30) - 15,
        pace: baseRating + Math.floor(Math.random() * 30) - 15,
        stamina: baseRating + Math.floor(Math.random() * 30) - 15,
        strength: baseRating + Math.floor(Math.random() * 30) - 15,
        agility: baseRating + Math.floor(Math.random() * 30) - 15,
        tackling: baseRating + Math.floor(Math.random() * 30) - 15,
        positioning: baseRating + Math.floor(Math.random() * 30) - 15,
        marking: baseRating + Math.floor(Math.random() * 30) - 15,
        interceptions: baseRating + Math.floor(Math.random() * 30) - 15,
        vision: baseRating + Math.floor(Math.random() * 30) - 15,
        decisionMaking: baseRating + Math.floor(Math.random() * 30) - 15,
        composure: baseRating + Math.floor(Math.random() * 30) - 15,
        workRate: baseRating + Math.floor(Math.random() * 30) - 15,
      };

      if (position === "Goalkeeper") {
        attributes.reflexes = baseRating + Math.floor(Math.random() * 30) - 15;
        attributes.handling = baseRating + Math.floor(Math.random() * 30) - 15;
        attributes.gkPositioning = baseRating + Math.floor(Math.random() * 30) - 15;
        attributes.distribution = baseRating + Math.floor(Math.random() * 30) - 15;
      }

      const currentAbility = calculateOverallRating(attributes, position);

      await this.createPlayer(saveGameId, userId, {
        name: playerNames[i],
        age,
        position,
        nationality: "Brazil",
        attributes,
        potential,
        currentAbility,
        form: 5 + Math.floor(Math.random() * 3),
        morale: 7 + Math.floor(Math.random() * 2),
        fitness: 90 + Math.floor(Math.random() * 10),
        condition: 85 + Math.floor(Math.random() * 15),
        injured: false,
        injuryDaysRemaining: 0,
        suspended: false,
        suspensionMatchesRemaining: 0,
        yellowCards: 0,
        redCards: 0,
        contract: {
          salary: 2000 + Math.floor(Math.random() * 3000),
          length: 2 + Math.floor(Math.random() * 3),
          releaseClause: 50000 + Math.floor(Math.random() * 150000),
        },
        value: 25000 + Math.floor(Math.random() * 100000),
        teamId: playerTeam.id,
        trainingFocus: {
          primary: "technical",
          secondary: "physical",
          intensity: "medium",
        },
        traits: [],
        seasonStats: {
          season: 1,
          appearances: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          cleanSheets: 0,
          totalMinutesPlayed: 0,
          averageRating: 0,
          shotsTotal: 0,
          shotsOnTarget: 0,
          passesTotal: 0,
          tacklesTotal: 0,
          interceptionsTotal: 0,
        },
        competitionStats: [],
        careerStats: {
          totalAppearances: 0,
          totalGoals: 0,
          totalAssists: 0,
          totalYellowCards: 0,
          totalRedCards: 0,
          totalCleanSheets: 0,
        },
      });
    }

    await this.createInboxMessage(saveGameId, userId, {
      category: "news",
      subject: "Welcome to FC United!",
      body: `Welcome to your new role as manager of FC United!\n\nThe board is excited to have you lead the team to success. Your objectives for this season are:\n\n- Finish in the top half of the league\n- Make a strong run in the cup competition\n\nYou have a talented young squad and a modest budget. Make the most of it!\n\nGood luck!`,
      from: "Board of Directors",
      date: new Date(2024, 7, 1),
      read: false,
      starred: false,
      priority: "high",
    });

    await db.insert(gameStates).values({
      saveGameId,
      userId,
      currentDate: new Date(2024, 7, 1),
      season: 2024,
      currentMonth: 8,
      playerTeamId: playerTeam.id,
      nextMatchId: null,
      monthlyTrainingInProgress: true,
      lastTrainingReportMonth: 7,
    });
  }
}

export const storage = new DbStorage();
