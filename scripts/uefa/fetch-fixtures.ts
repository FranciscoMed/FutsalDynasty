/**
 * Fetch Fixtures from UEFA API
 * Downloads match fixtures for specified seasons
 */

import * as fs from 'fs';
import * as path from 'path';
import { UEFAFixturesResponse, UEFAMatch } from './types';
import { SCRAPER_CONFIG, COMPETITION_ID } from './config';
import { SmartFetcher } from './utils/rate-limiter';
import { Logger, ProgressBar } from './utils/logger';

const logger = new Logger('FixturesFetcher');

interface SeasonConfig {
  seasonYear: number;
  fromDate: string;
  toDate: string;
  label: string;
}

interface FetchResult {
  season: SeasonConfig;
  matches: UEFAMatch[];
  totalFetched: number;
  duration: number;
}

/**
 * Seasons to fetch
 */
const SEASONS: SeasonConfig[] = [
  {
    seasonYear: 2024,
    fromDate: '2023-09-01',
    toDate: '2024-07-30',
    label: '2023/24',
  },
  {
    seasonYear: 2025,
    fromDate: '2024-09-01',
    toDate: '2025-07-30',
    label: '2024/25',
  },
];

/**
 * Build fixtures URL with pagination
 */
function buildFixturesUrl(season: SeasonConfig, offset: number, limit: number = 100): string {
  const params = new URLSearchParams({
    competitionId: COMPETITION_ID.FUTSAL_CHAMPIONS_LEAGUE.toString(),
    fromDate: season.fromDate,
    toDate: season.toDate,
    seasonYear: season.seasonYear.toString(),
    phase: 'ALL',
    order: 'ASC',
    limit: limit.toString(),
    offset: offset.toString(),
    utcOffset: '0',
  });

  return `${SCRAPER_CONFIG.endpoints.fixtures}?${params.toString()}`;
}

/**
 * Fetch all fixtures for a season with pagination
 */
async function fetchSeasonFixtures(
  season: SeasonConfig,
  fetcher: SmartFetcher
): Promise<FetchResult> {
  const startTime = Date.now();
  const allMatches: UEFAMatch[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  logger.info(`\nFetching fixtures for ${season.label} season (${season.seasonYear})...`);

  while (hasMore) {
    const url = buildFixturesUrl(season, offset, limit);
    logger.debug(`Fetching batch: offset=${offset}, limit=${limit}`);

    try {
      const response = await fetcher.fetch<UEFAMatch[]>(
        url,
        undefined,
        (attempt, error) => {
          logger.warn(`Retry attempt ${attempt} for offset ${offset}: ${error.message}`);
        }
      );

      const matches = Array.isArray(response) ? response : [];
      allMatches.push(...matches);

      logger.info(`  Fetched ${matches.length} matches (total: ${allMatches.length})`);

      // Check if there are more matches
      if (matches.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to fetch fixtures at offset ${offset}: ${errorMessage}`);
      throw error;
    }
  }

  const duration = Date.now() - startTime;

  return {
    season,
    matches: allMatches,
    totalFetched: allMatches.length,
    duration,
  };
}

/**
 * Display fetch results
 */
function displayResults(results: FetchResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('FIXTURES FETCH REPORT');
  console.log('='.repeat(80) + '\n');

  let totalMatches = 0;
  let totalDuration = 0;

  results.forEach((result, index) => {
    totalMatches += result.totalFetched;
    totalDuration += result.duration;

    console.log(`${index + 1}. Season ${result.season.label}`);
    console.log(`   Matches:     ${result.totalFetched}`);
    console.log(`   Duration:    ${(result.duration / 1000).toFixed(2)}s`);
    console.log('');
  });

  console.log('-'.repeat(80));
  console.log(`Total Matches:   ${totalMatches}`);
  console.log(`Total Duration:  ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Save fixtures to files
 */
function saveResults(results: FetchResult[]): void {
  const rawDir = path.join(process.cwd(), 'data/uefa-scrape/raw');

  // Create directory if needed
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
    logger.info(`Created directory: ${rawDir}`);
  }

  // Save each season separately
  results.forEach(result => {
    const filename = `fixtures-${result.season.seasonYear}.json`;
    const filepath = path.join(rawDir, filename);

    const data = {
      season: result.season.label,
      seasonYear: result.season.seasonYear,
      fetchedAt: new Date().toISOString(),
      totalMatches: result.totalFetched,
      matches: result.matches,
    };

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    logger.info(`Saved ${result.totalFetched} fixtures to: ${filepath}`);
  });

  // Save combined dataset
  const allMatches = results.flatMap(r => r.matches);
  const combinedPath = path.join(rawDir, 'fixtures-all.json');

  const combinedData = {
    seasons: results.map(r => ({
      label: r.season.label,
      seasonYear: r.season.seasonYear,
      matchCount: r.totalFetched,
    })),
    fetchedAt: new Date().toISOString(),
    totalMatches: allMatches.length,
    matches: allMatches,
  };

  fs.writeFileSync(combinedPath, JSON.stringify(combinedData, null, 2));
  logger.info(`Saved ${allMatches.length} combined fixtures to: ${combinedPath}`);

  // Generate summary stats
  const finishedMatches = allMatches.filter(m => m.status === 'FINISHED');
  const phases = new Set(allMatches.map(m => m.phase));

  console.log('\n📊 DATASET SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Total Matches:       ${allMatches.length}`);
  console.log(`Finished Matches:    ${finishedMatches.length}`);
  console.log(`Upcoming/Live:       ${allMatches.length - finishedMatches.length}`);
  console.log(`Phases:              ${Array.from(phases).join(', ')}`);
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  try {
    logger.info('Starting UEFA Fixtures Fetcher...');
    logger.info(`Fetching ${SEASONS.length} seasons`);

    const fetcher = new SmartFetcher(
      SCRAPER_CONFIG.rateLimit.requestsPerSecond,
      SCRAPER_CONFIG.rateLimit.retryAttempts,
      SCRAPER_CONFIG.rateLimit.retryDelay
    );

    const results: FetchResult[] = [];

    // Fetch each season
    for (const season of SEASONS) {
      const result = await fetchSeasonFixtures(season, fetcher);
      results.push(result);
    }

    // Display and save results
    displayResults(results);
    saveResults(results);

    const totalMatches = results.reduce((sum, r) => sum + r.totalFetched, 0);
    const fetcherStats = fetcher.getStats();

    logger.info(`Fixtures fetching complete! ✅`);
    logger.info(`Total matches fetched: ${totalMatches}`);
    logger.info(`Total API requests: ${fetcherStats.totalRequests}`);
    logger.info(`\nNext steps:`);
    logger.info(`1. Review fixtures in: data/uefa-scrape/raw/`);
    logger.info(`2. Analyze fixtures: npm run uefa:analyze`);
    logger.info(`3. Scrape statistics: npm run uefa:scrape-stats`);

  } catch (error) {
    logger.error('Fixtures fetching failed:', error);
    process.exit(1);
  }
}

// Run main function
main();

export { fetchSeasonFixtures, buildFixturesUrl };
