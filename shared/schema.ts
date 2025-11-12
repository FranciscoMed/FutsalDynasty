import { pgTable, serial, varchar, integer, boolean, timestamp, jsonb, text, index } from "drizzle-orm/pg-core";

export type Position = "Goalkeeper" | "Defender" | "Winger" | "Pivot";

export type Formation = "2-2" | "3-1" | "4-0" | "1-2-1" | "1-3" | "2-1-1";

// New formation types for tactics overhaul
export type TacticsFormation = "4-0" | "3-1" | "2-2" | "5-0";

export type TacticalPreset = "Defensive" | "Balanced" | "Attacking";

// Fly-goalkeeper usage settings
export type FlyGoalkeeperUsage = "Never" | "Sometimes" | "EndGame" | "Always";

// Tactics data structure for new tactics system
export interface TacticsData {
  formation: TacticsFormation;
  assignments: Record<string, number | null>; // slotId -> playerId
  substitutes: (number | null)[]; // Array of 5 player IDs
  // Tactical instructions (replaces individual fields)
  instructions?: {
    mentality: 'VeryDefensive' | 'Defensive' | 'Balanced' | 'Attacking' | 'VeryAttacking';
    pressingIntensity: 'Low' | 'Medium' | 'High' | 'VeryHigh';
    flyGoalkeeper: 'Never' | 'Sometimes' | 'Always';
  };
  // Phase 3: Tactical modifiers (deprecated - use instructions instead)
  mentality?: 'VeryDefensive' | 'Defensive' | 'Balanced' | 'Attacking' | 'VeryAttacking';
  pressingIntensity?: 'Low' | 'Medium' | 'High' | 'VeryHigh';
  width?: 'Narrow' | 'Balanced' | 'Wide';
  // Fly-goalkeeper settings
  flyGoalkeeper?: {
    usage: FlyGoalkeeperUsage;
    advancedPlayerId?: number; // Optional: specific player to use as advanced GK, otherwise uses GK
  };
}

export type TrainingIntensity = "low" | "medium" | "high";

export type TrainingFocus = "technical" | "physical" | "defensive" | "mental";

export type InboxCategory = "urgent" | "match" | "financial" | "squad" | "competition" | "news";

export type CompetitionType = "league" | "cup" | "continental" | "super_cup";

export type EventType = "match" | "training_completion" | "contract_expiry" | "month_end" | "season_end";

// ============================================================================
// MATCH ENGINE TYPES (Phase 1 - Enhanced Match Simulation)
// ============================================================================

// Player traits that affect match behavior
export type PlayerTrait = 
  // Offensive traits (affect selection for offensive actions)
  | 'attempts1v1' 
  | 'finisher'
  | 'attemptsLongShots'
  | 'playsWithFlair'
  | 'beatPlayerRepeatedly'
  // Playmaking traits
  | 'playmaker' 
  | 'does1_2' 
  | 'looksForPass'
  | 'triesKillerBalls'
  // Defensive traits
  | 'hardTackler' 
  | 'anticipates'
  | 'marksOpponentTightly'
  // Mental/Performance traits (affect success rates as exception)
  | 'nerveless' 
  | 'choker' 
  | 'classy'
  | 'bigMatchPlayer'
  | 'consistentPerformer'
  | 'inconsistent'
  // Teamwork traits
  | 'selfish'
  | 'leader'
  | 'communicator'
  // Goalkeeper traits (affect save success)
  | 'isFlyGoalkeeper';

// Tactical setup for a team
export interface TacticalSetup {
  mentality: 'VeryDefensive' | 'Defensive' | 'Balanced' | 'Attacking' | 'VeryAttacking';
  pressingIntensity: 'Low' | 'Medium' | 'High' | 'VeryHigh';
  width: 'Narrow' | 'Balanced' | 'Wide';
  customInstructions?: string;
  // Fly-goalkeeper settings
  flyGoalkeeper?: {
    usage: FlyGoalkeeperUsage;
    advancedPlayerId?: number;
  };
}

// Extended player with match-specific state
export interface PlayerWithTraits extends Player {
  traits: PlayerTrait[];
  energy: number;  // 0-100, current match energy
  minutesPlayedThisMatch: number;
}

// Counter-attack state tracking
export interface CounterAttackState {
  active: boolean;
  team: 'home' | 'away' | null;
  ticksRemaining: number;  // 2-tick window for counter-attack shot
}

// Live match state (server-side simulation state)
export interface LiveMatchState {
  // Match identification
  matchId: number;
  saveGameId: number;
  userId: number;
  homeTeamId: number;
  awayTeamId: number;
  competitionId: number;
  
  // Time tracking
  currentMinute: number;
  currentTick: number;  // 0-159 (15-second intervals)
  
  // Score & possession
  score: { home: number; away: number };
  possession: 'home' | 'away';
  
  // Momentum system (0-100, 50 = neutral)
  momentum: {
    value: number;
    trend: 'home' | 'away' | 'neutral';
    lastUpdate: number;  // Minute of last significant change
  };
  
  // Counter-attack tracking
  counterAttack: CounterAttackState;
  
  // Last event for context
  lastEvent: MatchEvent | null;
  
  // Phase 4: Substitution tracking
  substitutions: {
    used: { home: number; away: number };
    homeBench: PlayerWithTraits[];
    awayBench: PlayerWithTraits[];
    autoSubEnabled: { home: boolean; away: boolean };
    energyThreshold: number; // Default: 30%
  };
  
  // Match statistics
  statistics: {
    possession: { home: number; away: number };
    shots: { home: number; away: number };
    shotsOnTarget: { home: number; away: number };
    fouls: { home: number; away: number };
    corners: { home: number; away: number };
    saves: { home: number; away: number };
    tackles: { home: number; away: number };
    interceptions: { home: number; away: number };
    blocks: { home: number; away: number };
    dribblesSuccessful: { home: number; away: number };
    dribblesUnsuccessful: { home: number; away: number };
  };
  
  // Accumulated fouls (reset at half-time, 6+ = penalty kick from 10m)
  accumulatedFouls: { home: number; away: number };
  
  // Yellow card tracking (second yellow = red card)
  yellowCards: {
    home: number[]; // Array of player IDs who have received yellow cards
    away: number[]; // Array of player IDs who have received yellow cards
  };
  
  // Red card tracking (futsal rules: team plays with 4 players for 2 minutes or until opponent scores)
  redCards: {
    home: Array<{
      playerId: number;
      playerName: string;
      tickIssued: number;
      canReturnAt: number | null; // null means permanent expulsion (no return)
      returnCondition: 'time' | 'goal' | 'none'; // 'time' = after 2 min, 'goal' = after opponent scores, 'none' = no return
    }>;
    away: Array<{
      playerId: number;
      playerName: string;
      tickIssued: number;
      canReturnAt: number | null;
      returnCondition: 'time' | 'goal' | 'none';
    }>;
  };
  
  // Suspended players (sent off - cannot be selected for substitution)
  suspendedPlayers: {
    home: number[]; // Array of player IDs
    away: number[]; // Array of player IDs
  };
  
  // Events generated during match
  events: MatchEvent[];
  
  // Lineups with current state
  homeLineup: OnCourtPlayer[];
  awayLineup: OnCourtPlayer[];
  
  // Phase 3: Tactical setups for both teams
  homeTactics: TacticalSetup;
  awayTactics: TacticalSetup;
  
  // Team qualities
  homeTeamQuality: number;
  awayTeamQuality: number;
  
  // Expected goals
  homeExpectedGoals: number;
  awayExpectedGoals: number;
  
  // Control flags
  isPaused: boolean;
  speed: 1 | 2 | 4;
}

// Player state during match
export interface OnCourtPlayer {
  player: PlayerWithTraits;
  
  // Effective attributes (base + fatigue modifiers)
  effectiveAttributes: {
    shooting: number;
    passing: number;
    dribbling: number;
    pace: number;
    tackling: number;
    positioning: number;
    marking: number;
  };
  
  // Performance tracking
  performance: {
    shots: number;
    passes: number;
    tackles: number;
    interceptions: number;
    fouls: number;
    rating: number;
  };
}

// ============================================================================

export interface NextEvent {
  type: EventType;
  date: string;
  daysUntil: number;
  description: string;
  priority: number; // 1 = highest (match), 5 = lowest
  details?: {
    matchId?: number;
    playerId?: number;
    competitionId?: number;
    [key: string]: any;
  };
}

export interface GameEvent {
  id: string;
  type: EventType;
  date: string;
  description: string;
  priority: number;
  processed: boolean;
  details?: {
    matchId?: number;
    playerId?: number;
    competitionId?: number;
    [key: string]: any;
  };
}

export interface SimulationResult {
  matchId: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  competitionId: number;
}

export interface SimulationSummary {
  matchesSimulated: number;
  results: SimulationResult[];
}

export interface PlayerAttributes {
  shooting: number;
  passing: number;
  dribbling: number;
  ballControl: number;
  firstTouch: number;
  pace: number;
  stamina: number;
  strength: number;
  agility: number;
  tackling: number;
  positioning: number;
  marking: number;
  interceptions: number;
  vision: number;
  decisionMaking: number;
  composure: number;
  workRate: number;
  reflexes?: number;
  handling?: number;
  gkPositioning?: number;
  distribution?: number;
}

export interface Player {
  id: number;
  name: string;
  age: number;
  position: Position;
  nationality: string;
  attributes: PlayerAttributes;
  potential: number;
  currentAbility: number;
  form: number;
  morale: number;
  fitness: number;
  condition: number;
  injured: boolean;
  injuryDaysRemaining: number;
  suspended: boolean;
  suspensionMatchesRemaining: number;
  yellowCards: number;
  redCards: number;
  contract: PlayerContract;
  value: number;
  teamId: number;
  trainingFocus: {
    primary: string;
    secondary: string;
    intensity: TrainingIntensity;
  };
  traits: PlayerTrait[];
}

export interface PlayerContract {
  salary: number;
  length: number;
  releaseClause: number;
}

export interface Team {
  id: number;
  name: string;
  abbreviation: string;
  reputation: number;
  budget: number;
  wageBudget: number;
  stadium: string;
  formation: Formation;
  tacticalPreset: TacticalPreset;
  startingLineup: number[];
  substitutes: number[];
  isPlayerTeam: boolean;
  tactics?: TacticsData; // New tactics system data
}

export interface MatchEvent {
  minute: number;
  type: "goal" | "shot" | "tackle" | "foul" | "corner" | "yellow_card" | "red_card" | "substitution" | "injury" | "block" | "dribble" | "interception";
  playerId: number;
  playerName: string;
  teamId: number;
  assistId?: number;
  assistName?: string;
  description: string;
  shotQuality?: number;  // For shots: xG value
  isCounter?: boolean;  // For shots: was this a counter-attack?
  goalContext?: "open_play" | "corner" | "penalty_10m" | "counter_attack" | "dribble_buildup" | "free_kick" | "counter_vs_flyGK";  // For goals: how it was created
}

export interface MatchStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passAccuracy: number;
  tackles: number;
  interceptions: number;
  blocks: number;
  dribblesSuccessful: number;
  dribblesUnsuccessful: number;
  fouls: number;
  corners: number;
  saves: number;
}

export type MatchPreparationStatus = "pending" | "confirmed" | "simulating" | "completed";

export interface Match {
  id: number;
  competitionId: number;
  competitionType: CompetitionType;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  date: Date;
  played: boolean;
  preparationStatus?: MatchPreparationStatus;
  events: MatchEvent[];
  homeStats: MatchStats;
  awayStats: MatchStats;
  playerRatings: Record<number, number>;
}

export interface LeagueStanding {
  teamId: number;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string[];
}

export interface Competition {
  id: number;
  name: string;
  type: CompetitionType;
  season: number;
  teams: number[];
  fixtures: Match[];
  standings: LeagueStanding[];
  currentMatchday: number;
  totalMatchdays: number;
}

export interface TransferOffer {
  id: number;
  playerId: number;
  fromTeamId: number;
  toTeamId: number;
  offerAmount: number;
  wageOffer: number;
  status: "pending" | "accepted" | "rejected";
  date: Date;
}

export interface InboxMessage {
  id: number;
  category: InboxCategory;
  subject: string;
  body: string;
  from: string;
  date: Date;
  read: boolean;
  starred: boolean;
  priority: "low" | "medium" | "high";
  actionLink?: string;
}

export interface MonthlyTrainingReport {
  month: number;
  year: number;
  playerImprovements: {
    playerId: number;
    playerName: string;
    improvements: {
      attribute: string;
      oldValue: number;
      newValue: number;
      change: number;
    }[];
  }[];
}

export interface FinancialTransaction {
  id: number;
  date: Date;
  type: "income" | "expense";
  category: "match_day" | "prize_money" | "transfer" | "wage" | "facility" | "sponsorship";
  amount: number;
  description: string;
}

export interface Club {
  id: number;
  name: string;
  stadium: string;
  reputation: number;
  budget: number;
  wageBudget: number;
  trainingFacilityLevel: number;
  stadiumCapacity: number;
  youthAcademyLevel: number;
  staff: {
    assistantCoach: boolean;
    fitnessCoach: boolean;
    scout: boolean;
  };
  boardObjectives: {
    description: string;
    target: string;
    importance: "low" | "medium" | "high";
    completed: boolean;
  }[];
}

export interface GameState {
  currentDate: Date;
  season: number;
  currentMonth: number;
  playerTeamId: number;
  competitions: Competition[];
  nextMatchId: number | null;
  monthlyTrainingInProgress: boolean;
  lastTrainingReportMonth: number;
}

export function internalToDisplay(value: number): number {
  return Math.round(value / 10);
}

export function displayToInternal(value: number): number {
  return value * 10;
}

export interface User {
  id: number;
  username: string;
  password: string;
  email: string;
  createdAt: Date;
}

export interface SaveGame {
  id: number;
  userId: number;
  name: string;
  currentDate: Date;
  season: number;
  playerTeamId: number;
  createdAt: Date;
  updatedAt: Date;
}

export function calculateOverallRating(attributes: PlayerAttributes, position: Position): number {
  let overall = 0;
  
  switch (position) {
    case "Goalkeeper":
      overall = (
        (attributes.reflexes || 0) * 3 +
        (attributes.gkPositioning || 0) * 2.5 +
        (attributes.handling || 0) * 2.5 +
        (attributes.distribution || 0) * 1 +
        attributes.composure * 1
      ) / 10;
      break;
    
    case "Defender":
      overall = (
        attributes.tackling * 3 +
        attributes.positioning * 2.5 +
        attributes.marking * 2.5 +
        attributes.interceptions * 2 +
        attributes.strength * 1.5 +
        attributes.composure * 1.5 +
        attributes.passing * 1
      ) / 14;
      break;
    
    case "Winger":
      overall = (
        attributes.pace * 3 +
        attributes.dribbling * 2.5 +
        attributes.ballControl * 2 +
        attributes.shooting * 2 +
        attributes.passing * 1.5 +
        attributes.stamina * 1.5 +
        attributes.agility * 1.5
      ) / 14;
      break;
    
    case "Pivot":
      overall = (
        attributes.passing * 3 +
        attributes.vision * 2 +
        attributes.ballControl * 2 +
        attributes.shooting * 2 +
        attributes.stamina * 1.5 +
        attributes.decisionMaking * 1.5 +
        attributes.composure * 1
      ) / 13;
      break;
  }
  
  return Math.round(overall);
}

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  saveGameId: integer("save_game_id").notNull().references(() => saveGames.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  abbreviation: varchar("abbreviation", { length: 10 }).notNull(),
  reputation: integer("reputation").notNull(),
  budget: integer("budget").notNull(),
  wageBudget: integer("wage_budget").notNull(),
  stadium: varchar("stadium", { length: 255 }).notNull(),
  formation: varchar("formation", { length: 10 }).notNull().$type<Formation>(),
  tacticalPreset: varchar("tactical_preset", { length: 20 }).notNull().$type<TacticalPreset>(),
  startingLineup: jsonb("starting_lineup").notNull().$type<number[]>(),
  substitutes: jsonb("substitutes").notNull().$type<number[]>(),
  isPlayerTeam: boolean("is_player_team").notNull().default(false),
  tactics: jsonb("tactics").$type<TacticsData>(), // New tactics system data
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  saveGameId: integer("save_game_id").notNull().references(() => saveGames.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  age: integer("age").notNull(),
  position: varchar("position", { length: 20 }).notNull().$type<Position>(),
  nationality: varchar("nationality", { length: 100 }).notNull(),
  attributes: jsonb("attributes").notNull().$type<PlayerAttributes>(),
  potential: integer("potential").notNull(),
  currentAbility: integer("current_ability").notNull(),
  form: integer("form").notNull(),
  morale: integer("morale").notNull(),
  fitness: integer("fitness").notNull(),
  condition: integer("condition").notNull(),
  injured: boolean("injured").notNull().default(false),
  injuryDaysRemaining: integer("injury_days_remaining").notNull().default(0),
  suspended: boolean("suspended").notNull().default(false),
  suspensionMatchesRemaining: integer("suspension_matches_remaining").notNull().default(0),
  yellowCards: integer("yellow_cards").notNull().default(0),
  redCards: integer("red_cards").notNull().default(0),
  contract: jsonb("contract").notNull().$type<PlayerContract>(),
  value: integer("value").notNull(),
  teamId: integer("team_id").notNull(),
  trainingFocus: jsonb("training_focus").notNull().$type<{ primary: string; secondary: string; intensity: TrainingIntensity }>(),
  traits: jsonb("traits").notNull().$type<PlayerTrait[]>().default([]),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  saveGameId: integer("save_game_id").notNull().references(() => saveGames.id, { onDelete: "cascade" }),
  competitionId: integer("competition_id").notNull(),
  competitionType: varchar("competition_type", { length: 20 }).notNull().$type<CompetitionType>(),
  homeTeamId: integer("home_team_id").notNull(),
  awayTeamId: integer("away_team_id").notNull(),
  homeScore: integer("home_score").notNull().default(0),
  awayScore: integer("away_score").notNull().default(0),
  date: timestamp("date").notNull(),
  played: boolean("played").notNull().default(false),
  preparationStatus: varchar("preparation_status", { length: 20 }).default("pending").$type<MatchPreparationStatus>(),
  events: jsonb("events").notNull().$type<MatchEvent[]>().default([]),
  homeStats: jsonb("home_stats").notNull().$type<MatchStats>(),
  awayStats: jsonb("away_stats").notNull().$type<MatchStats>(),
  playerRatings: jsonb("player_ratings").notNull().$type<Record<number, number>>().default({}),
});

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  saveGameId: integer("save_game_id").notNull().references(() => saveGames.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().$type<CompetitionType>(),
  season: integer("season").notNull(),
  teams: jsonb("teams").notNull().$type<number[]>(),
  standings: jsonb("standings").notNull().$type<LeagueStanding[]>(),
  currentMatchday: integer("current_matchday").notNull().default(0),
  totalMatchdays: integer("total_matchdays").notNull(),
});

export const transferOffers = pgTable("transfer_offers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  saveGameId: integer("save_game_id").notNull().references(() => saveGames.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull(),
  fromTeamId: integer("from_team_id").notNull(),
  toTeamId: integer("to_team_id").notNull(),
  offerAmount: integer("offer_amount").notNull(),
  wageOffer: integer("wage_offer").notNull(),
  status: varchar("status", { length: 20 }).notNull().$type<"pending" | "accepted" | "rejected">(),
  date: timestamp("date").notNull(),
});

export const inboxMessages = pgTable("inbox_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  saveGameId: integer("save_game_id").notNull().references(() => saveGames.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 20 }).notNull().$type<InboxCategory>(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  from: varchar("from", { length: 255 }).notNull(),
  date: timestamp("date").notNull(),
  read: boolean("read").notNull().default(false),
  starred: boolean("starred").notNull().default(false),
  priority: varchar("priority", { length: 10 }).notNull().$type<"low" | "medium" | "high">(),
  actionLink: varchar("action_link", { length: 500 }),
});

export const financialTransactions = pgTable("financial_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  saveGameId: integer("save_game_id").notNull().references(() => saveGames.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  type: varchar("type", { length: 10 }).notNull().$type<"income" | "expense">(),
  category: varchar("category", { length: 20 }).notNull().$type<"match_day" | "prize_money" | "transfer" | "wage" | "facility" | "sponsorship">(),
  amount: integer("amount").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
});

export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  saveGameId: integer("save_game_id").notNull().references(() => saveGames.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  stadium: varchar("stadium", { length: 255 }).notNull(),
  reputation: integer("reputation").notNull(),
  budget: integer("budget").notNull(),
  wageBudget: integer("wage_budget").notNull(),
  trainingFacilityLevel: integer("training_facility_level").notNull().default(1),
  stadiumCapacity: integer("stadium_capacity").notNull(),
  youthAcademyLevel: integer("youth_academy_level").notNull().default(1),
  staff: jsonb("staff").notNull().$type<{ assistantCoach: boolean; fitnessCoach: boolean; scout: boolean }>(),
  boardObjectives: jsonb("board_objectives").notNull().$type<{ description: string; target: string; importance: "low" | "medium" | "high"; completed: boolean }[]>(),
});

export const gameStates = pgTable("game_states", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  saveGameId: integer("save_game_id").notNull().references(() => saveGames.id, { onDelete: "cascade" }),
  currentDate: timestamp("current_date").notNull(),
  season: integer("season").notNull(),
  currentMonth: integer("current_month").notNull(),
  playerTeamId: integer("player_team_id").notNull(),
  nextMatchId: integer("next_match_id"),
  monthlyTrainingInProgress: boolean("monthly_training_in_progress").notNull().default(true),
  lastTrainingReportMonth: integer("last_training_report_month").notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const saveGames = pgTable("save_games", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  currentDate: timestamp("current_date").notNull(),
  season: integer("season").notNull(),
  playerTeamId: integer("player_team_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const trainingReports = pgTable("training_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  saveGameId: integer("save_game_id").notNull().references(() => saveGames.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  playerImprovements: jsonb("player_improvements").notNull().$type<{
    playerId: number;
    playerName: string;
    improvements: {
      attribute: string;
      oldValue: number;
      newValue: number;
      change: number;
    }[];
  }[]>(),
  date: timestamp("date").notNull().defaultNow(),
});

// Audit Logs for security tracking
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  saveGameId: integer("save_game_id"),
  action: text("action").notNull(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Composite indexes for performance (userId + savegameId)
// Temporarily commented out to debug JSON parse error
/*
export const teamsIndexes = {
  userSavegame: index("idx_teams_user_savegame").on(teams.userId, teams.saveGameId),
};

export const playersIndexes = {
  userSavegame: index("idx_players_user_savegame").on(players.userId, players.saveGameId),
};

export const matchesIndexes = {
  userSavegame: index("idx_matches_user_savegame").on(matches.userId, matches.saveGameId),
};

export const competitionsIndexes = {
  userSavegame: index("idx_competitions_user_savegame").on(competitions.userId, competitions.saveGameId),
};

export const transferOffersIndexes = {
  userSavegame: index("idx_transfer_offers_user_savegame").on(transferOffers.userId, transferOffers.saveGameId),
};

export const inboxMessagesIndexes = {
  userSavegame: index("idx_inbox_messages_user_savegame").on(inboxMessages.userId, inboxMessages.saveGameId),
};

export const financialTransactionsIndexes = {
  userSavegame: index("idx_financial_transactions_user_savegame").on(financialTransactions.userId, financialTransactions.saveGameId),
};

export const clubsIndexes = {
  userSavegame: index("idx_clubs_user_savegame").on(clubs.userId, clubs.saveGameId),
};

export const gameStatesIndexes = {
  userSavegame: index("idx_game_states_user_savegame").on(gameStates.userId, gameStates.saveGameId),
};

export const trainingReportsIndexes = {
  userSavegame: index("idx_training_reports_user_savegame").on(trainingReports.userId, trainingReports.saveGameId),
};

export const saveGamesIndexes = {
  user: index("idx_save_games_user").on(saveGames.userId),
};

export const auditLogsIndexes = {
  user: index("idx_audit_logs_user").on(auditLogs.userId),
};
*/

// Type exports for audit logs
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
