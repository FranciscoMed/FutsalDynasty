/**
 * Scrape Match Statistics from UEFA API
 * Fetches detailed statistics for each match using match IDs
 */

import * as fs from 'fs';
import * as path from 'path';
import { TeamStatisticsResponse, MatchStatistics, TeamStatistics } from './types';
import { SCRAPER_CONFIG, DATA_PATHS } from './config';
import { SmartFetcher } from './utils/rate-limiter';
import { Logger, ProgressBar } from './utils/logger';

const logger = new Logger('StatisticsScraper');

interface ScrapeResult {
  matchId: string;
  success: boolean;
  statistics?: MatchStatistics;
  error?: string;
}

interface ScrapeReport {
  totalMatches: number;
  successful: number;
  failed: number;
  duration: number;
  statistics: MatchStatistics[];
  errors: Array<{ matchId: string; error: string }>;
}

/**
 * Load match IDs from analysis file
 */
function loadMatchIds(): string[] {
  const matchIdsPath = path.join(process.cwd(), DATA_PATHS.analysis.summary.replace('statistical-summary.json', 'match-ids.json'));
  
  if (!fs.existsSync(matchIdsPath)) {
    throw new Error(`Match IDs file not found: ${matchIdsPath}\nRun 'npm run uefa:analyze' first!`);
  }

  const data = JSON.parse(fs.readFileSync(matchIdsPath, 'utf-8'));
  const matchIds = data.withCompleteData || data.allFinished || [];
  
  logger.info(`Loaded ${matchIds.length} match IDs`);
  return matchIds;
}

/**
 * Parse statistic value to number
 */
function parseStatValue(value: string | undefined): number {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Transform raw statistics to structured format
 */
function transformStatistics(
  matchId: string,
  rawStats: TeamStatisticsResponse[]
): MatchStatistics {
  // Handle penalty shootouts which may have 3 entries (home, away, penalties)
  // We only need the first 2 (actual teams)
  if (rawStats.length < 2) {
    throw new Error(`Expected at least 2 teams, got ${rawStats.length}`);
  }
  
  if (rawStats.length > 2) {
    logger.debug(`Match ${matchId} has ${rawStats.length} entries (likely penalty shootout), using first 2 teams`);
  }

  const [team1, team2] = rawStats;

  const parseTeamStats = (teamData: TeamStatisticsResponse): TeamStatistics => {
    const stats = teamData.statistics.reduce((acc, stat) => {
      acc[stat.name] = stat.value;
      return acc;
    }, {} as Record<string, string>);

    return {
      teamId: teamData.teamId,
      teamName: teamData.teamId,
      goals: parseStatValue(stats.goals),
      attempts: parseStatValue(stats.attempts),
      attemptsOnTarget: parseStatValue(stats.attempts_on_target),
      attemptsOffTarget: parseStatValue(stats.attempts_off_target),
      attemptsBlocked: parseStatValue(stats.attempts_blocked),
      attemptsSaved: parseStatValue(stats.attempts_saved),
      shotAccuracy: parseStatValue(stats.attempts_accuracy),
      foulsCommitted: parseStatValue(stats.fouls_committed),
      foulsSuffered: parseStatValue(stats.fouls_suffered),
      yellowCards: parseStatValue(stats.yellow_cards),
      redCards: parseStatValue(stats.red_cards),
      corners: parseStatValue(stats.corners),
      woodworkHits: parseStatValue(stats.attempts_on_woodwork),
      assists: parseStatValue(stats.assists),
      freeKicksOnGoal: parseStatValue(stats.free_kicks_on_goal),
      ownGoals: parseStatValue(stats.own_goals_for),
      playedTimeMinutes: parseStatValue(stats.played_time),
    };
  };

  return {
    matchId,
    homeTeam: parseTeamStats(team1),
    awayTeam: parseTeamStats(team2),
  };
}

/**
 * Fetch statistics for a single match
 */
async function fetchMatchStatistics(
  matchId: string,
  fetcher: SmartFetcher
): Promise<ScrapeResult> {
  const url = `${SCRAPER_CONFIG.endpoints.statistics}/${matchId}`;
  
  try {
    logger.debug(`Fetching statistics for match ${matchId}`);
    
    const rawStats = await fetcher.fetch<TeamStatisticsResponse[]>(
      url,
      undefined,
      (attempt, error) => {
        logger.warn(`Retry attempt ${attempt} for match ${matchId}: ${error.message}`);
      }
    );

    const statistics = transformStatistics(matchId, rawStats);
    
    return {
      matchId,
      success: true,
      statistics,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to fetch statistics for match ${matchId}: ${errorMessage}`);
    
    return {
      matchId,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Scrape statistics for all matches
 */
async function scrapeAllStatistics(matchIds: string[]): Promise<ScrapeReport> {
  const startTime = Date.now();
  const fetcher = new SmartFetcher(
    SCRAPER_CONFIG.rateLimit.requestsPerSecond,
    SCRAPER_CONFIG.rateLimit.retryAttempts,
    SCRAPER_CONFIG.rateLimit.retryDelay
  );

  const statistics: MatchStatistics[] = [];
  const errors: Array<{ matchId: string; error: string }> = [];
  
  logger.info(`Starting to scrape statistics for ${matchIds.length} matches...`);
  logger.info(`Rate limit: ${SCRAPER_CONFIG.rateLimit.requestsPerSecond} requests/second`);
  
  const progressBar = new ProgressBar(matchIds.length, 'Scraping statistics');

  for (let i = 0; i < matchIds.length; i++) {
    const matchId = matchIds[i];
    const result = await fetchMatchStatistics(matchId, fetcher);
    
    if (result.success && result.statistics) {
      statistics.push(result.statistics);
    } else if (result.error) {
      errors.push({ matchId, error: result.error });
    }
    
    progressBar.update(i + 1);
  }

  const duration = Date.now() - startTime;
  const fetcherStats = fetcher.getStats();
  
  logger.info(`\nScraping complete!`);
  logger.info(`Total requests: ${fetcherStats.totalRequests}`);
  logger.info(`Duration: ${(duration / 1000).toFixed(2)}s`);

  return {
    totalMatches: matchIds.length,
    successful: statistics.length,
    failed: errors.length,
    duration,
    statistics,
    errors,
  };
}

/**
 * Display scraping report
 */
function displayReport(report: ScrapeReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('STATISTICS SCRAPING REPORT');
  console.log('='.repeat(80) + '\n');

  console.log('📊 SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Total Matches:        ${report.totalMatches}`);
  console.log(`Successful:           ${report.successful} (${(report.successful / report.totalMatches * 100).toFixed(1)}%)`);
  console.log(`Failed:               ${report.failed} (${(report.failed / report.totalMatches * 100).toFixed(1)}%)`);
  console.log(`Duration:             ${(report.duration / 1000).toFixed(2)}s`);
  console.log(`Avg per match:        ${(report.duration / report.totalMatches / 1000).toFixed(2)}s`);
  console.log('');

  if (report.statistics.length > 0) {
    // Calculate some quick stats
    const totalGoals = report.statistics.reduce((sum, match) => 
      sum + match.homeTeam.goals + match.awayTeam.goals, 0
    );
    const totalShots = report.statistics.reduce((sum, match) => 
      sum + match.homeTeam.attempts + match.awayTeam.attempts, 0
    );
    const totalFouls = report.statistics.reduce((sum, match) => 
      sum + match.homeTeam.foulsCommitted + match.awayTeam.foulsCommitted, 0
    );
    const totalYellowCards = report.statistics.reduce((sum, match) => 
      sum + match.homeTeam.yellowCards + match.awayTeam.yellowCards, 0
    );

    console.log('📈 QUICK STATS');
    console.log('-'.repeat(80));
    console.log(`Total Goals:          ${totalGoals}`);
    console.log(`Avg Goals/Match:      ${(totalGoals / report.successful).toFixed(2)}`);
    console.log(`Total Shots:          ${totalShots}`);
    console.log(`Avg Shots/Match:      ${(totalShots / report.successful / 2).toFixed(2)} per team`);
    console.log(`Total Fouls:          ${totalFouls}`);
    console.log(`Avg Fouls/Match:      ${(totalFouls / report.successful / 2).toFixed(2)} per team`);
    console.log(`Total Yellow Cards:   ${totalYellowCards}`);
    console.log(`Avg Cards/Match:      ${(totalYellowCards / report.successful / 2).toFixed(2)} per team`);
    console.log('');
  }

  if (report.errors.length > 0) {
    console.log('❌ ERRORS');
    console.log('-'.repeat(80));
    report.errors.forEach((error, index) => {
      console.log(`${index + 1}. Match ${error.matchId}: ${error.error}`);
    });
    console.log('');
  }

  console.log('='.repeat(80) + '\n');
}

/**
 * Save results to files
 */
function saveResults(report: ScrapeReport): void {
  const outputDir = path.join(process.cwd(), 'data/uefa-scrape/processed');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    logger.info(`Created directory: ${outputDir}`);
  }

  // Save all statistics
  const statsPath = path.join(outputDir, 'all-statistics.json');
  fs.writeFileSync(statsPath, JSON.stringify(report.statistics, null, 2));
  logger.info(`Saved statistics to: ${statsPath}`);

  // Save scraping report
  const reportPath = path.join(outputDir, 'scraping-report.json');
  const reportData = {
    timestamp: new Date().toISOString(),
    totalMatches: report.totalMatches,
    successful: report.successful,
    failed: report.failed,
    duration: report.duration,
    errors: report.errors,
  };
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  logger.info(`Saved report to: ${reportPath}`);

  // Save individual match files (optional, for debugging)
  const individualDir = path.join(outputDir, 'individual');
  if (!fs.existsSync(individualDir)) {
    fs.mkdirSync(individualDir, { recursive: true });
  }

  report.statistics.forEach(match => {
    const matchPath = path.join(individualDir, `${match.matchId}.json`);
    fs.writeFileSync(matchPath, JSON.stringify(match, null, 2));
  });
  logger.info(`Saved ${report.statistics.length} individual match files to: ${individualDir}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    logger.info('Starting UEFA statistics scraper...');
    
    // Load match IDs
    const matchIds = loadMatchIds();
    
    if (matchIds.length === 0) {
      throw new Error('No match IDs found. Run "npm run uefa:analyze" first!');
    }

    // Confirm before scraping
    logger.info(`\nAbout to scrape statistics for ${matchIds.length} matches`);
    logger.info(`Estimated time: ~${(matchIds.length * 0.5).toFixed(0)} seconds`);
    logger.info('');

    // Scrape statistics
    const report = await scrapeAllStatistics(matchIds);
    
    // Display results
    displayReport(report);
    
    // Save results
    saveResults(report);
    
    logger.info('Statistics scraping complete! ✅');
    logger.info(`\nNext steps:`);
    logger.info(`1. Review statistics in: data/uefa-scrape/processed/`);
    logger.info(`2. Run comprehensive analysis: npm run uefa:analyze-all`);
    logger.info(`3. Integrate findings into match engine`);
    
    if (report.failed > 0) {
      logger.warn(`\n⚠️  ${report.failed} matches failed to scrape. Check errors above.`);
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('Statistics scraping failed:', error);
    process.exit(1);
  }
}

// Run main function
main();

export { fetchMatchStatistics, scrapeAllStatistics, transformStatistics };
