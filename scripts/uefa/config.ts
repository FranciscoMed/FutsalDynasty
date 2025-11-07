/**
 * UEFA Data Scraper Configuration
 */

import { ScraperConfig } from './types';

export const SCRAPER_CONFIG: ScraperConfig = {
  rateLimit: {
    requestsPerSecond: 2,
    retryAttempts: 3,
    retryDelay: 1000, // ms
  },
  endpoints: {
    fixtures: 'https://match.uefa.com/v5/matches',
    statistics: 'https://matchstats.uefa.com/v2/team-statistics',
    events: 'https://editorial.uefa.com/api/liveblogs',
  },
  filters: {
    seasons: ['2023', '2024', '2025', '2026'],
    phases: ['QUALIFYING', 'TOURNAMENT'],
    status: ['FINISHED'],
    minMatches: 50,
    maxMatches: 500,
  },
};

export const COMPETITION_ID = {
  FUTSAL_CHAMPIONS_LEAGUE: '27',
} as const;

export const DATA_PATHS = {
  raw: {
    fixtures: 'agent_plans/Match Exp/Scrape UEFA/Fixtures.json',
    matchInfo: 'agent_plans/Match Exp/Scrape UEFA/MatchInfo.json',
    statistics: 'agent_plans/Match Exp/Scrape UEFA/Statistics.json',
    events: 'agent_plans/Match Exp/Scrape UEFA/Events.json',
  },
  processed: {
    allStatistics: 'data/uefa-scrape/processed/all-statistics.json',
    allEvents: 'data/uefa-scrape/processed/all-events.json',
    combined: 'data/uefa-scrape/processed/matches-combined.json',
  },
  analysis: {
    summary: 'data/uefa-scrape/analysis/statistical-summary.json',
    goalTiming: 'data/uefa-scrape/analysis/goal-timing.json',
    eventDistributions: 'data/uefa-scrape/analysis/event-distributions.json',
    insights: 'data/uefa-scrape/analysis/insights-report.json',
  },
} as const;

export const FUTSAL_MATCH_CONFIG = {
  // Match duration
  halfDuration: 20, // minutes
  totalDuration: 40, // minutes
  
  // Expected ranges (for validation)
  expectedRanges: {
    goalsPerMatch: { min: 0, max: 15, typical: [3, 7] },
    shotsPerTeam: { min: 5, max: 50, typical: [15, 35] },
    foulsPerTeam: { min: 0, max: 20, typical: [5, 12] },
    yellowCardsPerTeam: { min: 0, max: 5, typical: [0, 2] },
    redCardsPerTeam: { min: 0, max: 2, typical: [0, 0] },
    cornersPerTeam: { min: 0, max: 15, typical: [3, 8] },
  },
} as const;
