import { pgTable, serial, varchar, integer, boolean, timestamp, jsonb, text } from "drizzle-orm/pg-core";

export type Position = "Goalkeeper" | "Defender" | "Winger" | "Pivot";

export type Formation = "2-2" | "3-1" | "4-0" | "1-2-1" | "1-3" | "2-1-1";

export type TacticalPreset = "Defensive" | "Balanced" | "Attacking";

export type TrainingIntensity = "low" | "medium" | "high";

export type TrainingFocus = "technical" | "physical" | "defensive" | "mental";

export type InboxCategory = "urgent" | "match" | "financial" | "squad" | "competition" | "news";

export type CompetitionType = "league" | "cup" | "continental" | "super_cup";

export type EventType = "match" | "training_completion" | "contract_expiry" | "month_end" | "season_end";

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
}

export interface MatchEvent {
  minute: number;
  type: "goal" | "yellow_card" | "red_card" | "substitution" | "injury";
  playerId: number;
  playerName: string;
  teamId: number;
  assistId?: number;
  assistName?: string;
  description: string;
}

export interface MatchStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passAccuracy: number;
  tackles: number;
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
  saveGameId: integer("save_game_id"),
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
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  saveGameId: integer("save_game_id"),
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
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  saveGameId: integer("save_game_id"),
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
  saveGameId: integer("save_game_id"),
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
  saveGameId: integer("save_game_id"),
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
  saveGameId: integer("save_game_id"),
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
  saveGameId: integer("save_game_id"),
  date: timestamp("date").notNull(),
  type: varchar("type", { length: 10 }).notNull().$type<"income" | "expense">(),
  category: varchar("category", { length: 20 }).notNull().$type<"match_day" | "prize_money" | "transfer" | "wage" | "facility" | "sponsorship">(),
  amount: integer("amount").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
});

export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  saveGameId: integer("save_game_id"),
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
  currentDate: timestamp("current_date").notNull(),
  season: integer("season").notNull(),
  currentMonth: integer("current_month").notNull(),
  playerTeamId: integer("player_team_id").notNull(),
  nextMatchId: integer("next_match_id"),
  monthlyTrainingInProgress: boolean("monthly_training_in_progress").notNull().default(true),
  lastTrainingReportMonth: integer("last_training_report_month").notNull(),
  saveGameId: integer("save_game_id"),
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
  saveGameId: integer("save_game_id"),
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
