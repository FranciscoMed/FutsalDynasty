/**
 * UEFA Futsal Data Types
 * Type definitions for UEFA API responses and internal data structures
 */

// ============================================================================
// API Response Types
// ============================================================================

export interface UEFAFixturesResponse {
  matches: UEFAMatch[];
  total?: number;
}

export interface UEFAMatch {
  id: string;
  status: 'FINISHED' | 'LIVE' | 'SCHEDULED' | 'POSTPONED';
  seasonYear: string;
  type: string;
  phase?: string;
  lineupStatus?: 'AVAILABLE' | 'TACTICAL_AVAILABLE' | 'NOT_AVAILABLE';
  kickOffTime: {
    date: string;
    dateTime: string;
    utcOffsetInHours: number;
  };
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  score?: {
    regular?: {
      home: number;
      away: number;
    };
    total: {
      home: number;
      away: number;
    };
  };
  playerEvents?: {
    scorers?: GoalEvent[];
  };
  competition: CompetitionInfo;
  round: RoundInfo;
  group?: GroupInfo;
  stadium?: StadiumInfo;
  matchAttendance?: number;
  fullTimeAt?: string;
  referees?: RefereeInfo[];
}

export interface TeamInfo {
  id: string;
  internationalName: string;
  countryCode: string;
  logoUrl?: string;
  associationId?: string;
  translations?: {
    displayName?: Record<string, string>;
    countryName?: Record<string, string>;
  };
}

export interface GoalEvent {
  id: string;
  goalType: 'SCORED' | 'PENALTY' | 'OWN_GOAL';
  phase: 'FIRST_HALF' | 'SECOND_HALF';
  teamId: string;
  time: {
    minute: number;
    second: number;
  };
  player?: PlayerInfo;
}

export interface PlayerInfo {
  id: string;
  internationalName: string;
  countryCode: string;
  fieldPosition: 'GOALKEEPER' | 'DEFENDER' | 'FORWARD';
  clubJerseyNumber?: string;
  age?: string;
  imageUrl?: string;
}

export interface CompetitionInfo {
  id: string;
  code: string;
  metaData: {
    name: string;
  };
  translations?: {
    name?: Record<string, string>;
  };
}

export interface RoundInfo {
  id: string;
  phase: 'QUALIFYING' | 'TOURNAMENT';
  mode: string;
  status: string;
  metaData: {
    name: string;
    type: string;
  };
}

export interface GroupInfo {
  id: string;
  order: number;
  metaData: {
    groupName: string;
    groupShortName: string;
  };
}

export interface StadiumInfo {
  id: string;
  capacity?: number;
  city?: {
    id: string;
    countryCode: string;
    translations?: {
      name?: Record<string, string>;
    };
  };
  translations?: {
    name?: Record<string, string>;
  };
}

export interface RefereeInfo {
  role: string;
  person: {
    id: string;
    countryCode: string;
    gender: string;
    translations?: {
      name?: Record<string, string>;
    };
  };
}

// ============================================================================
// Statistics API Types
// ============================================================================

export interface TeamStatisticsResponse {
  teamId: string;
  statistics: StatisticItem[];
}

export interface StatisticItem {
  name: string;
  value: string;
  unit?: string;
  attributes?: Record<string, string>;
}

export interface MatchStatistics {
  matchId: string;
  homeTeam: TeamStatistics;
  awayTeam: TeamStatistics;
}

export interface TeamStatistics {
  teamId: string;
  teamName: string;
  goals: number;
  attempts: number;
  attemptsOnTarget: number;
  attemptsOffTarget: number;
  attemptsBlocked: number;
  attemptsSaved: number;
  shotAccuracy: number;
  foulsCommitted: number;
  foulsSuffered: number;
  yellowCards: number;
  redCards: number;
  corners: number;
  woodworkHits: number;
  assists: number;
  freeKicksOnGoal: number;
  ownGoals: number;
  playedTimeMinutes: number;
}

// ============================================================================
// Events API Types
// ============================================================================

export interface LiveEvent {
  id: string;
  timestamp: string;
  attributes: {
    liveblogPostData?: {
      lbPostFSPEvent?: FSPEvent;
    };
  };
}

export interface FSPEvent {
  eventId: string;
  eventType: EventType;
  eventSubType?: string;
  eventPhase: 'FIRST_HALF' | 'SECOND_HALF';
  eventMinute: string;
  eventSecond: string;
  eventDisplayMinute: string;
  eventDateTimeUTC: string;
  idMatch: string;
  idTeam: string;
  idPlayer?: string;
  namePlayer?: string;
  fieldPositionPlayer?: string;
  idPlayerTo?: string;
  namePlayerTo?: string;
  eventTranslation?: string;
}

export enum EventType {
  GOAL = 'GOAL',
  SHOT_ON_GOAL = 'SHOT_ON_GOAL',
  SHOT_WIDE = 'SHOT_WIDE',
  SHOT_BLOCKED = 'SHOT_BLOCKED',
  SAVE = 'SAVE',
  FOUL = 'FOUL',
  CORNER = 'CORNER',
  YELLOW_CARD = 'YELLOW_CARD',
  RED_CARD = 'RED_CARD',
  SUBSTITUTION = 'SUBSTITUTION',
}

// ============================================================================
// Analysis Types
// ============================================================================

export interface MatchAnalysisData {
  matchId: string;
  matchInfo: UEFAMatch;
  statistics?: MatchStatistics;
  events?: MatchEvent[];
}

export interface MatchEvent {
  eventId: string;
  matchId: string;
  eventType: EventType;
  eventSubType?: string;
  phase: 'FIRST_HALF' | 'SECOND_HALF';
  minute: number;
  second: number;
  totalSeconds: number;
  playerId?: string;
  playerName?: string;
  playerPosition?: string;
  teamId: string;
  targetPlayerId?: string;
  targetPlayerName?: string;
  description?: string;
}

export interface GoalTimingData {
  matchId: string;
  goals: Array<{
    minute: number;
    second: number;
    totalSeconds: number;
    phase: 'FIRST_HALF' | 'SECOND_HALF';
    scoringTeam: string;
    scoringPlayer?: string;
    position?: string;
  }>;
}

export interface StatisticalSummary {
  totalMatches: number;
  averages: {
    goalsPerMatch: number;
    shotsPerTeam: number;
    shotsOnTargetPerTeam: number;
    shotAccuracy: number;
    foulsPerTeam: number;
    yellowCardsPerTeam: number;
    redCardsPerTeam: number;
    cornersPerTeam: number;
    savesPerTeam: number;
  };
  distributions: {
    goalsByMinute: Record<number, number>;
    goalsByPhase: {
      firstHalf: number;
      secondHalf: number;
    };
    scoreLines: Record<string, number>;
  };
  correlations: {
    shotsToGoals: number;
    shotsOnTargetToGoals: number;
    foulsToCards: number;
  };
}

// ============================================================================
// Scraper Configuration
// ============================================================================

export interface ScraperConfig {
  rateLimit: {
    requestsPerSecond: number;
    retryAttempts: number;
    retryDelay: number;
  };
  endpoints: {
    fixtures: string;
    statistics: string;
    events: string;
  };
  filters: {
    seasons?: string[];
    phases?: string[];
    status?: string[];
    minMatches?: number;
    maxMatches?: number;
  };
}

export interface ScraperProgress {
  total: number;
  completed: number;
  failed: number;
  startTime: Date;
  estimatedTimeRemaining?: number;
}

// ============================================================================
// Data Storage Types
// ============================================================================

export interface DataSnapshot {
  version: string;
  generatedAt: string;
  source: 'fixtures' | 'statistics' | 'events' | 'combined';
  matchCount: number;
  data: any;
  metadata?: {
    seasons: string[];
    competitions: string[];
    dataQuality?: DataQualityMetrics;
  };
}

export interface DataQualityMetrics {
  completeness: number; // 0-1
  missingFields: string[];
  outliers: number;
  validationErrors: string[];
}
