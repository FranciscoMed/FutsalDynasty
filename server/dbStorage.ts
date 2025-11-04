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
import { eq, desc, and } from "drizzle-orm";
import type { IStorage } from "./storage";

export class DbStorage implements IStorage {
  async getPlayer(saveGameId: number, id: number): Promise<Player | undefined> {
    const result = await db.select().from(players)
      .where(and(eq(players.saveGameId, saveGameId), eq(players.id, id)))
      .limit(1);
    return result[0] as Player | undefined;
  }

  async getAllPlayers(saveGameId: number): Promise<Player[]> {
    const result = await db.select().from(players)
      .where(eq(players.saveGameId, saveGameId));
    return result as Player[];
  }

  async getPlayersByTeam(saveGameId: number, teamId: number): Promise<Player[]> {
    const result = await db.select().from(players)
      .where(and(eq(players.saveGameId, saveGameId), eq(players.teamId, teamId)));
    return result as Player[];
  }

  async createPlayer(saveGameId: number, player: Omit<Player, "id">): Promise<Player> {
    const result = await db.insert(players)
      .values({ ...player, saveGameId })
      .returning();
    return result[0] as Player;
  }

  async updatePlayer(saveGameId: number, id: number, player: Partial<Player>): Promise<Player | undefined> {
    const result = await db.update(players)
      .set(player)
      .where(and(eq(players.saveGameId, saveGameId), eq(players.id, id)))
      .returning();
    return result[0] as Player | undefined;
  }

  async getTeam(saveGameId: number, id: number): Promise<Team | undefined> {
    const result = await db.select().from(teams)
      .where(and(eq(teams.saveGameId, saveGameId), eq(teams.id, id)))
      .limit(1);
    return result[0] as Team | undefined;
  }

  async getAllTeams(saveGameId: number): Promise<Team[]> {
    const result = await db.select().from(teams)
      .where(eq(teams.saveGameId, saveGameId));
    return result as Team[];
  }

  async createTeam(saveGameId: number, team: Omit<Team, "id">): Promise<Team> {
    const result = await db.insert(teams)
      .values({ ...team, saveGameId })
      .returning();
    return result[0] as Team;
  }

  async updateTeam(saveGameId: number, id: number, team: Partial<Team>): Promise<Team | undefined> {
    const result = await db.update(teams)
      .set(team)
      .where(and(eq(teams.saveGameId, saveGameId), eq(teams.id, id)))
      .returning();
    return result[0] as Team | undefined;
  }

  async getMatch(saveGameId: number, id: number): Promise<Match | undefined> {
    const result = await db.select().from(matches)
      .where(and(eq(matches.saveGameId, saveGameId), eq(matches.id, id)))
      .limit(1);
    return result[0] as Match | undefined;
  }

  async getAllMatches(saveGameId: number): Promise<Match[]> {
    const result = await db.select().from(matches)
      .where(eq(matches.saveGameId, saveGameId));
    return result as Match[];
  }

  async getMatchesByCompetition(saveGameId: number, competitionId: number): Promise<Match[]> {
    const result = await db.select().from(matches)
      .where(and(eq(matches.saveGameId, saveGameId), eq(matches.competitionId, competitionId)));
    return result as Match[];
  }

  async createMatch(saveGameId: number, match: Omit<Match, "id">): Promise<Match> {
    const result = await db.insert(matches)
      .values({ ...match, saveGameId })
      .returning();
    return result[0] as Match;
  }

  async updateMatch(saveGameId: number, id: number, match: Partial<Match>): Promise<Match | undefined> {
    const result = await db.update(matches)
      .set(match)
      .where(and(eq(matches.saveGameId, saveGameId), eq(matches.id, id)))
      .returning();
    return result[0] as Match | undefined;
  }

  async getCompetition(saveGameId: number, id: number): Promise<Competition | undefined> {
    const result = await db.select().from(competitions)
      .where(and(eq(competitions.saveGameId, saveGameId), eq(competitions.id, id)))
      .limit(1);
    if (!result[0]) return undefined;
    
    const comp = result[0];
    const compMatches = await this.getMatchesByCompetition(saveGameId, id);
    
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

  async getAllCompetitions(saveGameId: number): Promise<Competition[]> {
    const result = await db.select().from(competitions)
      .where(eq(competitions.saveGameId, saveGameId));
    const comps: Competition[] = [];
    
    for (const comp of result) {
      const compMatches = await this.getMatchesByCompetition(saveGameId, comp.id);
      comps.push({
        id: comp.id,
        name: comp.name,
        type: comp.type,
        season: comp.season,
        teams: comp.teams,
        fixtures: compMatches,
        standings: comp.standings,
        currentMatchday: comp.currentMatchday,
        totalMatchdays: comp.totalMatchdays,
      } as Competition);
    }
    
    return comps;
  }

  async createCompetition(saveGameId: number, competition: Omit<Competition, "id">): Promise<Competition> {
    const { fixtures, ...compData } = competition;
    const result = await db.insert(competitions)
      .values({ ...compData, saveGameId })
      .returning();
    const created = result[0];
    
    for (const match of fixtures) {
      await this.createMatch(saveGameId, { ...match, competitionId: created.id });
    }
    
    return await this.getCompetition(saveGameId, created.id) as Competition;
  }

  async updateCompetition(saveGameId: number, id: number, competition: Partial<Competition>): Promise<Competition | undefined> {
    const { fixtures, ...compData } = competition;
    await db.update(competitions)
      .set(compData)
      .where(and(eq(competitions.saveGameId, saveGameId), eq(competitions.id, id)));
    return await this.getCompetition(saveGameId, id);
  }

  async getTransferOffer(saveGameId: number, id: number): Promise<TransferOffer | undefined> {
    const result = await db.select().from(transferOffers)
      .where(and(eq(transferOffers.saveGameId, saveGameId), eq(transferOffers.id, id)))
      .limit(1);
    return result[0] as TransferOffer | undefined;
  }

  async getAllTransferOffers(saveGameId: number): Promise<TransferOffer[]> {
    const result = await db.select().from(transferOffers)
      .where(eq(transferOffers.saveGameId, saveGameId));
    return result as TransferOffer[];
  }

  async getTransferOffersByTeam(saveGameId: number, teamId: number): Promise<TransferOffer[]> {
    const result = await db.select().from(transferOffers)
      .where(eq(transferOffers.saveGameId, saveGameId));
    return (result as TransferOffer[]).filter(
      o => o.toTeamId === teamId || o.fromTeamId === teamId
    );
  }

  async createTransferOffer(saveGameId: number, offer: Omit<TransferOffer, "id">): Promise<TransferOffer> {
    const result = await db.insert(transferOffers)
      .values({ ...offer, saveGameId })
      .returning();
    return result[0] as TransferOffer;
  }

  async updateTransferOffer(saveGameId: number, id: number, offer: Partial<TransferOffer>): Promise<TransferOffer | undefined> {
    const result = await db.update(transferOffers)
      .set(offer)
      .where(and(eq(transferOffers.saveGameId, saveGameId), eq(transferOffers.id, id)))
      .returning();
    return result[0] as TransferOffer | undefined;
  }

  async getInboxMessage(saveGameId: number, id: number): Promise<InboxMessage | undefined> {
    const result = await db.select().from(inboxMessages)
      .where(and(eq(inboxMessages.saveGameId, saveGameId), eq(inboxMessages.id, id)))
      .limit(1);
    return result[0] as InboxMessage | undefined;
  }

  async getAllInboxMessages(saveGameId: number): Promise<InboxMessage[]> {
    const result = await db.select().from(inboxMessages)
      .where(eq(inboxMessages.saveGameId, saveGameId))
      .orderBy(desc(inboxMessages.date));
    return result as InboxMessage[];
  }

  async createInboxMessage(saveGameId: number, message: Omit<InboxMessage, "id">): Promise<InboxMessage> {
    const result = await db.insert(inboxMessages)
      .values({ ...message, saveGameId })
      .returning();
    return result[0] as InboxMessage;
  }

  async updateInboxMessage(saveGameId: number, id: number, message: Partial<InboxMessage>): Promise<InboxMessage | undefined> {
    const result = await db.update(inboxMessages)
      .set(message)
      .where(and(eq(inboxMessages.saveGameId, saveGameId), eq(inboxMessages.id, id)))
      .returning();
    return result[0] as InboxMessage | undefined;
  }

  async deleteInboxMessage(saveGameId: number, id: number): Promise<boolean> {
    await db.delete(inboxMessages)
      .where(and(eq(inboxMessages.saveGameId, saveGameId), eq(inboxMessages.id, id)));
    return true;
  }

  async getFinancialTransaction(saveGameId: number, id: number): Promise<FinancialTransaction | undefined> {
    const result = await db.select().from(financialTransactions)
      .where(and(eq(financialTransactions.saveGameId, saveGameId), eq(financialTransactions.id, id)))
      .limit(1);
    return result[0] as FinancialTransaction | undefined;
  }

  async getAllFinancialTransactions(saveGameId: number): Promise<FinancialTransaction[]> {
    const result = await db.select().from(financialTransactions)
      .where(eq(financialTransactions.saveGameId, saveGameId))
      .orderBy(desc(financialTransactions.date));
    return result as FinancialTransaction[];
  }

  async createFinancialTransaction(saveGameId: number, transaction: Omit<FinancialTransaction, "id">): Promise<FinancialTransaction> {
    const result = await db.insert(financialTransactions)
      .values({ ...transaction, saveGameId })
      .returning();
    return result[0] as FinancialTransaction;
  }

  async getClub(saveGameId: number): Promise<Club | undefined> {
    const result = await db.select().from(clubs)
      .where(eq(clubs.saveGameId, saveGameId))
      .limit(1);
    return result[0] as Club | undefined;
  }

  async updateClub(saveGameId: number, club: Partial<Club>): Promise<Club | undefined> {
    const existing = await this.getClub(saveGameId);
    if (!existing) return undefined;
    const result = await db.update(clubs)
      .set(club)
      .where(and(eq(clubs.saveGameId, saveGameId), eq(clubs.id, existing.id)))
      .returning();
    return result[0] as Club | undefined;
  }

  async getGameState(saveGameId: number): Promise<GameState> {
    const result = await db.select().from(gameStates)
      .where(eq(gameStates.saveGameId, saveGameId))
      .limit(1);
    if (!result[0]) {
      throw new Error("Game state not found");
    }
    
    const state = result[0];
    const comps = await this.getAllCompetitions(saveGameId);
    
    return {
      currentDate: state.currentDate,
      season: state.season,
      currentMonth: state.currentMonth,
      playerTeamId: state.playerTeamId,
      competitions: comps,
      nextMatchId: state.nextMatchId,
      monthlyTrainingInProgress: state.monthlyTrainingInProgress,
      lastTrainingReportMonth: state.lastTrainingReportMonth,
    };
  }

  async updateGameState(saveGameId: number, state: Partial<GameState>): Promise<GameState> {
    const existing = await db.select().from(gameStates)
      .where(eq(gameStates.saveGameId, saveGameId))
      .limit(1);
    if (!existing[0]) {
      throw new Error("Game state not found");
    }
    
    const { competitions, ...stateData } = state;
    await db.update(gameStates)
      .set(stateData)
      .where(and(eq(gameStates.saveGameId, saveGameId), eq(gameStates.id, existing[0].id)));
    return await this.getGameState(saveGameId);
  }

  async createGameState(saveGameId: number, state: Omit<GameState, "id">): Promise<GameState> {
    const { competitions, ...stateData } = state;
    const result = await db.insert(gameStates)
      .values({ ...stateData, saveGameId })
      .returning();
    return await this.getGameState(saveGameId);
  }

  async createClub(saveGameId: number, club: Omit<Club, "id">): Promise<Club> {
    const result = await db.insert(clubs)
      .values({ ...club, saveGameId })
      .returning();
    return result[0] as Club;
  }

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
    await db.delete(saveGames).where(eq(saveGames.id, id));
    return true;
  }

  async initializeGame(): Promise<void> {
    const existingState = await db.select().from(gameStates).limit(1);
    if (existingState.length > 0) {
      console.log("Game already initialized");
      return;
    }

    const playerTeam = await this.createTeam({
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

      await this.createPlayer({
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
      });
    }

    await this.createInboxMessage({
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
