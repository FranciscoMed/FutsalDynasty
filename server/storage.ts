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
  type PlayerAttributes,
  calculateOverallRating,
} from "@shared/schema";

export interface IStorage {
  getPlayer(id: number): Promise<Player | undefined>;
  getAllPlayers(): Promise<Player[]>;
  getPlayersByTeam(teamId: number): Promise<Player[]>;
  createPlayer(player: Omit<Player, "id">): Promise<Player>;
  updatePlayer(id: number, player: Partial<Player>): Promise<Player | undefined>;
  
  getTeam(id: number): Promise<Team | undefined>;
  getAllTeams(): Promise<Team[]>;
  createTeam(team: Omit<Team, "id">): Promise<Team>;
  updateTeam(id: number, team: Partial<Team>): Promise<Team | undefined>;
  
  getMatch(id: number): Promise<Match | undefined>;
  getAllMatches(): Promise<Match[]>;
  getMatchesByCompetition(competitionId: number): Promise<Match[]>;
  createMatch(match: Omit<Match, "id">): Promise<Match>;
  updateMatch(id: number, match: Partial<Match>): Promise<Match | undefined>;
  
  getCompetition(id: number): Promise<Competition | undefined>;
  getAllCompetitions(): Promise<Competition[]>;
  createCompetition(competition: Omit<Competition, "id">): Promise<Competition>;
  updateCompetition(id: number, competition: Partial<Competition>): Promise<Competition | undefined>;
  
  getTransferOffer(id: number): Promise<TransferOffer | undefined>;
  getAllTransferOffers(): Promise<TransferOffer[]>;
  getTransferOffersByTeam(teamId: number): Promise<TransferOffer[]>;
  createTransferOffer(offer: Omit<TransferOffer, "id">): Promise<TransferOffer>;
  updateTransferOffer(id: number, offer: Partial<TransferOffer>): Promise<TransferOffer | undefined>;
  
  getInboxMessage(id: number): Promise<InboxMessage | undefined>;
  getAllInboxMessages(): Promise<InboxMessage[]>;
  createInboxMessage(message: Omit<InboxMessage, "id">): Promise<InboxMessage>;
  updateInboxMessage(id: number, message: Partial<InboxMessage>): Promise<InboxMessage | undefined>;
  deleteInboxMessage(id: number): Promise<boolean>;
  
  getFinancialTransaction(id: number): Promise<FinancialTransaction | undefined>;
  getAllFinancialTransactions(): Promise<FinancialTransaction[]>;
  createFinancialTransaction(transaction: Omit<FinancialTransaction, "id">): Promise<FinancialTransaction>;
  
  getClub(): Promise<Club | undefined>;
  updateClub(club: Partial<Club>): Promise<Club | undefined>;
  
  getGameState(): Promise<GameState>;
  updateGameState(state: Partial<GameState>): Promise<GameState>;
  
  initializeGame(): Promise<void>;
}

export class MemStorage implements IStorage {
  private players: Map<number, Player>;
  private teams: Map<number, Team>;
  private matches: Map<number, Match>;
  private competitions: Map<number, Competition>;
  private transferOffers: Map<number, TransferOffer>;
  private inboxMessages: Map<number, InboxMessage>;
  private financialTransactions: Map<number, FinancialTransaction>;
  private club: Club | undefined;
  private gameState: GameState;
  
  private playerIdCounter: number;
  private teamIdCounter: number;
  private matchIdCounter: number;
  private competitionIdCounter: number;
  private transferOfferIdCounter: number;
  private inboxMessageIdCounter: number;
  private transactionIdCounter: number;

  constructor() {
    this.players = new Map();
    this.teams = new Map();
    this.matches = new Map();
    this.competitions = new Map();
    this.transferOffers = new Map();
    this.inboxMessages = new Map();
    this.financialTransactions = new Map();
    
    this.playerIdCounter = 1;
    this.teamIdCounter = 1;
    this.matchIdCounter = 1;
    this.competitionIdCounter = 1;
    this.transferOfferIdCounter = 1;
    this.inboxMessageIdCounter = 1;
    this.transactionIdCounter = 1;
    
    this.gameState = {
      currentDate: new Date(2024, 7, 1),
      season: 2024,
      currentMonth: 8,
      playerTeamId: 1,
      competitions: [],
      nextMatchId: null,
      monthlyTrainingInProgress: true,
      lastTrainingReportMonth: 7,
    };
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getAllPlayers(): Promise<Player[]> {
    return Array.from(this.players.values());
  }

  async getPlayersByTeam(teamId: number): Promise<Player[]> {
    return Array.from(this.players.values()).filter(p => p.teamId === teamId);
  }

  async createPlayer(player: Omit<Player, "id">): Promise<Player> {
    const id = this.playerIdCounter++;
    const newPlayer: Player = { ...player, id };
    this.players.set(id, newPlayer);
    return newPlayer;
  }

  async updatePlayer(id: number, player: Partial<Player>): Promise<Player | undefined> {
    const existing = this.players.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...player };
    this.players.set(id, updated);
    return updated;
  }

  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getAllTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async createTeam(team: Omit<Team, "id">): Promise<Team> {
    const id = this.teamIdCounter++;
    const newTeam: Team = { ...team, id };
    this.teams.set(id, newTeam);
    return newTeam;
  }

  async updateTeam(id: number, team: Partial<Team>): Promise<Team | undefined> {
    const existing = this.teams.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...team };
    this.teams.set(id, updated);
    return updated;
  }

  async getMatch(id: number): Promise<Match | undefined> {
    return this.matches.get(id);
  }

  async getAllMatches(): Promise<Match[]> {
    return Array.from(this.matches.values());
  }

  async getMatchesByCompetition(competitionId: number): Promise<Match[]> {
    return Array.from(this.matches.values()).filter(m => m.competitionId === competitionId);
  }

  async createMatch(match: Omit<Match, "id">): Promise<Match> {
    const id = this.matchIdCounter++;
    const newMatch: Match = { ...match, id };
    this.matches.set(id, newMatch);
    return newMatch;
  }

  async updateMatch(id: number, match: Partial<Match>): Promise<Match | undefined> {
    const existing = this.matches.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...match };
    this.matches.set(id, updated);
    return updated;
  }

  async getCompetition(id: number): Promise<Competition | undefined> {
    return this.competitions.get(id);
  }

  async getAllCompetitions(): Promise<Competition[]> {
    return Array.from(this.competitions.values());
  }

  async createCompetition(competition: Omit<Competition, "id">): Promise<Competition> {
    const id = this.competitionIdCounter++;
    const newCompetition: Competition = { ...competition, id };
    this.competitions.set(id, newCompetition);
    return newCompetition;
  }

  async updateCompetition(id: number, competition: Partial<Competition>): Promise<Competition | undefined> {
    const existing = this.competitions.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...competition };
    this.competitions.set(id, updated);
    return updated;
  }

  async getTransferOffer(id: number): Promise<TransferOffer | undefined> {
    return this.transferOffers.get(id);
  }

  async getAllTransferOffers(): Promise<TransferOffer[]> {
    return Array.from(this.transferOffers.values());
  }

  async getTransferOffersByTeam(teamId: number): Promise<TransferOffer[]> {
    return Array.from(this.transferOffers.values()).filter(
      o => o.toTeamId === teamId || o.fromTeamId === teamId
    );
  }

  async createTransferOffer(offer: Omit<TransferOffer, "id">): Promise<TransferOffer> {
    const id = this.transferOfferIdCounter++;
    const newOffer: TransferOffer = { ...offer, id };
    this.transferOffers.set(id, newOffer);
    return newOffer;
  }

  async updateTransferOffer(id: number, offer: Partial<TransferOffer>): Promise<TransferOffer | undefined> {
    const existing = this.transferOffers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...offer };
    this.transferOffers.set(id, updated);
    return updated;
  }

  async getInboxMessage(id: number): Promise<InboxMessage | undefined> {
    return this.inboxMessages.get(id);
  }

  async getAllInboxMessages(): Promise<InboxMessage[]> {
    return Array.from(this.inboxMessages.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async createInboxMessage(message: Omit<InboxMessage, "id">): Promise<InboxMessage> {
    const id = this.inboxMessageIdCounter++;
    const newMessage: InboxMessage = { ...message, id };
    this.inboxMessages.set(id, newMessage);
    return newMessage;
  }

  async updateInboxMessage(id: number, message: Partial<InboxMessage>): Promise<InboxMessage | undefined> {
    const existing = this.inboxMessages.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...message };
    this.inboxMessages.set(id, updated);
    return updated;
  }

  async deleteInboxMessage(id: number): Promise<boolean> {
    return this.inboxMessages.delete(id);
  }

  async getFinancialTransaction(id: number): Promise<FinancialTransaction | undefined> {
    return this.financialTransactions.get(id);
  }

  async getAllFinancialTransactions(): Promise<FinancialTransaction[]> {
    return Array.from(this.financialTransactions.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async createFinancialTransaction(transaction: Omit<FinancialTransaction, "id">): Promise<FinancialTransaction> {
    const id = this.transactionIdCounter++;
    const newTransaction: FinancialTransaction = { ...transaction, id };
    this.financialTransactions.set(id, newTransaction);
    return newTransaction;
  }

  async getClub(): Promise<Club | undefined> {
    return this.club;
  }

  async updateClub(club: Partial<Club>): Promise<Club | undefined> {
    if (!this.club) return undefined;
    this.club = { ...this.club, ...club };
    return this.club;
  }

  async getGameState(): Promise<GameState> {
    return this.gameState;
  }

  async updateGameState(state: Partial<GameState>): Promise<GameState> {
    this.gameState = { ...this.gameState, ...state };
    return this.gameState;
  }

  async initializeGame(): Promise<void> {
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

    this.club = {
      id: 1,
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
          importance: "high",
          completed: false,
        },
        {
          description: "Reach cup quarter-finals",
          target: "Quarter-Finals",
          importance: "medium",
          completed: false,
        },
      ],
    };

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
      date: this.gameState.currentDate,
      read: false,
      starred: false,
      priority: "high",
    });

    this.gameState.playerTeamId = playerTeam.id;
  }
}

export const storage = new MemStorage();
