export type Position = "Goalkeeper" | "Defender" | "Winger" | "Pivot";

export type Formation = "2-2" | "3-1" | "4-0" | "1-2-1" | "1-3" | "2-1-1";

export type TacticalPreset = "Defensive" | "Balanced" | "Attacking";

export type TrainingIntensity = "low" | "medium" | "high";

export type TrainingFocus = "technical" | "physical" | "defensive" | "mental";

export type InboxCategory = "urgent" | "match" | "financial" | "squad" | "competition" | "news";

export type CompetitionType = "league" | "cup" | "continental" | "super_cup";

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
