/**
 * Analyze Fixtures.json
 * Extract insights from existing fixture data without making any API calls
 */

import * as fs from 'fs';
import * as path from 'path';
import { UEFAMatch, GoalTimingData, StatisticalSummary } from './types';
import { DATA_PATHS } from './config';
import { Logger, ProgressBar } from './utils/logger';

const logger = new Logger('AnalyzeFixtures');

interface FixtureAnalysis {
  overview: {
    totalMatches: number;
    finishedMatches: number;
    matchesWithLineups: number;
    matchesWithGoals: number;
    seasons: Record<string, number>;
    phases: Record<string, number>;
  };
  goalAnalysis: {
    totalGoals: number;
    goalsByMinute: Record<number, number>;
    goalsByPhase: {
      firstHalf: number;
      secondHalf: number;
    };
    goalsByPosition: Record<string, number>;
    averageGoalsPerMatch: number;
  };
  scoreAnalysis: {
    scoreLines: Record<string, number>;
    highestScore: {
      matchId: string;
      score: string;
      totalGoals: number;
    };
    averageHomeGoals: number;
    averageAwayGoals: number;
    homeWins: number;
    awayWins: number;
    draws: number;
  };
  timingPatterns: {
    earlyGoals: number; // 0-10 min
    midGameGoals: number; // 10-30 min
    lateGoals: number; // 30-40 min
    lastMinuteGoals: number; // 38-40 min
  };
  matchIds: {
    allFinished: string[];
    withCompleteData: string[];
    highScoring: string[]; // 8+ goals
    lowScoring: string[]; // 0-2 goals
  };
}

/**
 * Load fixtures from JSON file
 */
function loadFixtures(): UEFAMatch[] {
  // Try to load the combined fixtures file first (new format from fetch-fixtures.ts)
  const combinedPath = path.join(process.cwd(), 'data/uefa-scrape/raw/fixtures-all.json');
  
  if (fs.existsSync(combinedPath)) {
    logger.info(`Loading fixtures from: ${combinedPath}`);
    const data = JSON.parse(fs.readFileSync(combinedPath, 'utf-8'));
    const matches = data.matches || [];
    logger.info(`Loaded ${matches.length} fixtures from combined file`);
    return matches;
  }
  
  // Fallback to old Fixtures.json (qualifying rounds)
  const oldPath = path.join(process.cwd(), DATA_PATHS.raw.fixtures);
  
  if (!fs.existsSync(oldPath)) {
    throw new Error(`Fixtures file not found. Run 'npm run uefa:fetch' first!`);
  }

  logger.info(`Loading fixtures from: ${oldPath}`);
  const data = fs.readFileSync(oldPath, 'utf-8');
  const fixtures = JSON.parse(data) as UEFAMatch[];
  logger.info(`Loaded ${fixtures.length} fixtures`);
  return fixtures;
}

/**
 * Analyze fixture data
 */
function analyzeFixtures(fixtures: UEFAMatch[]): FixtureAnalysis {
  logger.info('Starting fixture analysis...');
  
  const analysis: FixtureAnalysis = {
    overview: {
      totalMatches: fixtures.length,
      finishedMatches: 0,
      matchesWithLineups: 0,
      matchesWithGoals: 0,
      seasons: {},
      phases: {},
    },
    goalAnalysis: {
      totalGoals: 0,
      goalsByMinute: {},
      goalsByPhase: {
        firstHalf: 0,
        secondHalf: 0,
      },
      goalsByPosition: {},
      averageGoalsPerMatch: 0,
    },
    scoreAnalysis: {
      scoreLines: {},
      highestScore: {
        matchId: '',
        score: '',
        totalGoals: 0,
      },
      averageHomeGoals: 0,
      averageAwayGoals: 0,
      homeWins: 0,
      awayWins: 0,
      draws: 0,
    },
    timingPatterns: {
      earlyGoals: 0,
      midGameGoals: 0,
      lateGoals: 0,
      lastMinuteGoals: 0,
    },
    matchIds: {
      allFinished: [],
      withCompleteData: [],
      highScoring: [],
      lowScoring: [],
    },
  };

  const progressBar = new ProgressBar(fixtures.length, 'Analyzing matches');
  let totalHomeGoals = 0;
  let totalAwayGoals = 0;

  fixtures.forEach((match, index) => {
    progressBar.update(index + 1);

    // Season tracking
    const season = match.seasonYear;
    analysis.overview.seasons[season] = (analysis.overview.seasons[season] || 0) + 1;

    // Phase tracking
    const phase = match.round?.phase || 'UNKNOWN';
    analysis.overview.phases[phase] = (analysis.overview.phases[phase] || 0) + 1;

    // Only analyze finished matches
    if (match.status !== 'FINISHED') return;
    analysis.overview.finishedMatches++;
    analysis.matchIds.allFinished.push(match.id);

    // Lineup status
    if (match.lineupStatus === 'AVAILABLE' || match.lineupStatus === 'TACTICAL_AVAILABLE') {
      analysis.overview.matchesWithLineups++;
      analysis.matchIds.withCompleteData.push(match.id);
    }

    // Score analysis
    if (match.score?.total) {
      const homeGoals = match.score.total.home;
      const awayGoals = match.score.total.away;
      const totalGoals = homeGoals + awayGoals;

      totalHomeGoals += homeGoals;
      totalAwayGoals += awayGoals;

      const scoreLine = `${homeGoals}-${awayGoals}`;
      analysis.scoreAnalysis.scoreLines[scoreLine] = 
        (analysis.scoreAnalysis.scoreLines[scoreLine] || 0) + 1;

      // Track highest scoring match
      if (totalGoals > analysis.scoreAnalysis.highestScore.totalGoals) {
        analysis.scoreAnalysis.highestScore = {
          matchId: match.id,
          score: scoreLine,
          totalGoals,
        };
      }

      // Win/draw tracking
      if (homeGoals > awayGoals) analysis.scoreAnalysis.homeWins++;
      else if (awayGoals > homeGoals) analysis.scoreAnalysis.awayWins++;
      else analysis.scoreAnalysis.draws++;

      // High/low scoring matches
      if (totalGoals >= 8) analysis.matchIds.highScoring.push(match.id);
      if (totalGoals <= 2) analysis.matchIds.lowScoring.push(match.id);
    }

    // Goal events analysis
    if (match.playerEvents?.scorers && match.playerEvents.scorers.length > 0) {
      analysis.overview.matchesWithGoals++;

      match.playerEvents.scorers.forEach(goal => {
        analysis.goalAnalysis.totalGoals++;

        // Timing by minute
        const minute = goal.time.minute;
        analysis.goalAnalysis.goalsByMinute[minute] = 
          (analysis.goalAnalysis.goalsByMinute[minute] || 0) + 1;

        // Phase
        if (goal.phase === 'FIRST_HALF') {
          analysis.goalAnalysis.goalsByPhase.firstHalf++;
        } else {
          analysis.goalAnalysis.goalsByPhase.secondHalf++;
        }

        // Position
        const position = goal.player?.fieldPosition || 'UNKNOWN';
        analysis.goalAnalysis.goalsByPosition[position] = 
          (analysis.goalAnalysis.goalsByPosition[position] || 0) + 1;

        // Timing patterns
        if (minute < 10) analysis.timingPatterns.earlyGoals++;
        else if (minute < 30) analysis.timingPatterns.midGameGoals++;
        else analysis.timingPatterns.lateGoals++;

        if (minute >= 38) analysis.timingPatterns.lastMinuteGoals++;
      });
    }
  });

  // Calculate averages
  if (analysis.overview.finishedMatches > 0) {
    analysis.goalAnalysis.averageGoalsPerMatch = 
      analysis.goalAnalysis.totalGoals / analysis.overview.finishedMatches;
    analysis.scoreAnalysis.averageHomeGoals = 
      totalHomeGoals / analysis.overview.finishedMatches;
    analysis.scoreAnalysis.averageAwayGoals = 
      totalAwayGoals / analysis.overview.finishedMatches;
  }

  logger.info('Analysis complete!');
  return analysis;
}

/**
 * Extract goal timing data for each match
 */
function extractGoalTimingData(fixtures: UEFAMatch[]): GoalTimingData[] {
  logger.info('Extracting detailed goal timing data...');
  
  const goalTimingData: GoalTimingData[] = [];

  fixtures.forEach(match => {
    if (match.status !== 'FINISHED' || !match.playerEvents?.scorers) return;

    const goals = match.playerEvents.scorers.map(goal => ({
      minute: goal.time.minute,
      second: goal.time.second,
      totalSeconds: (goal.time.minute * 60) + goal.time.second,
      phase: goal.phase,
      scoringTeam: goal.teamId,
      scoringPlayer: goal.player?.internationalName,
      position: goal.player?.fieldPosition,
    }));

    if (goals.length > 0) {
      goalTimingData.push({
        matchId: match.id,
        goals,
      });
    }
  });

  logger.info(`Extracted goal timing for ${goalTimingData.length} matches`);
  return goalTimingData;
}

/**
 * Display analysis results
 */
function displayResults(analysis: FixtureAnalysis): void {
  console.log('\n' + '='.repeat(80));
  console.log('UEFA FUTSAL FIXTURES ANALYSIS REPORT');
  console.log('='.repeat(80) + '\n');

  // Overview
  console.log('📊 OVERVIEW');
  console.log('-'.repeat(80));
  console.log(`Total Matches:        ${analysis.overview.totalMatches}`);
  console.log(`Finished Matches:     ${analysis.overview.finishedMatches}`);
  console.log(`With Lineups:         ${analysis.overview.matchesWithLineups}`);
  console.log(`With Goal Data:       ${analysis.overview.matchesWithGoals}`);
  console.log('');

  console.log('Seasons:');
  Object.entries(analysis.overview.seasons)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([season, count]) => {
      console.log(`  ${season}: ${count} matches`);
    });
  console.log('');

  console.log('Phases:');
  Object.entries(analysis.overview.phases).forEach(([phase, count]) => {
    console.log(`  ${phase}: ${count} matches`);
  });
  console.log('');

  // Goals
  console.log('⚽ GOAL ANALYSIS');
  console.log('-'.repeat(80));
  console.log(`Total Goals:          ${analysis.goalAnalysis.totalGoals}`);
  console.log(`Avg Goals/Match:      ${analysis.goalAnalysis.averageGoalsPerMatch.toFixed(2)}`);
  console.log('');

  console.log('Goals by Phase:');
  console.log(`  First Half:         ${analysis.goalAnalysis.goalsByPhase.firstHalf} (${(analysis.goalAnalysis.goalsByPhase.firstHalf / analysis.goalAnalysis.totalGoals * 100).toFixed(1)}%)`);
  console.log(`  Second Half:        ${analysis.goalAnalysis.goalsByPhase.secondHalf} (${(analysis.goalAnalysis.goalsByPhase.secondHalf / analysis.goalAnalysis.totalGoals * 100).toFixed(1)}%)`);
  console.log('');

  console.log('Goals by Position:');
  Object.entries(analysis.goalAnalysis.goalsByPosition)
    .sort(([, a], [, b]) => b - a)
    .forEach(([position, count]) => {
      const percentage = (count / analysis.goalAnalysis.totalGoals * 100).toFixed(1);
      console.log(`  ${position.padEnd(12)}: ${count} (${percentage}%)`);
    });
  console.log('');

  // Timing Patterns
  console.log('⏱️  TIMING PATTERNS');
  console.log('-'.repeat(80));
  console.log(`Early (0-10 min):     ${analysis.timingPatterns.earlyGoals}`);
  console.log(`Mid-game (10-30):     ${analysis.timingPatterns.midGameGoals}`);
  console.log(`Late (30-40):         ${analysis.timingPatterns.lateGoals}`);
  console.log(`Last Minute (38-40):  ${analysis.timingPatterns.lastMinuteGoals}`);
  console.log('');

  // Most common minutes (top 10)
  console.log('Top 10 Goal Minutes:');
  Object.entries(analysis.goalAnalysis.goalsByMinute)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([minute, count], index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. Minute ${minute.padStart(2)}: ${count} goals`);
    });
  console.log('');

  // Scores
  console.log('📈 SCORE ANALYSIS');
  console.log('-'.repeat(80));
  console.log(`Avg Home Goals:       ${analysis.scoreAnalysis.averageHomeGoals.toFixed(2)}`);
  console.log(`Avg Away Goals:       ${analysis.scoreAnalysis.averageAwayGoals.toFixed(2)}`);
  console.log(`Home Wins:            ${analysis.scoreAnalysis.homeWins}`);
  console.log(`Away Wins:            ${analysis.scoreAnalysis.awayWins}`);
  console.log(`Draws:                ${analysis.scoreAnalysis.draws}`);
  console.log('');

  console.log(`Highest Scoring:      ${analysis.scoreAnalysis.highestScore.score} (Match ID: ${analysis.scoreAnalysis.highestScore.matchId})`);
  console.log('');

  console.log('Most Common Score Lines:');
  Object.entries(analysis.scoreAnalysis.scoreLines)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([score, count], index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${score}: ${count} matches`);
    });
  console.log('');

  // Match IDs
  console.log('🎯 AVAILABLE MATCH IDS');
  console.log('-'.repeat(80));
  console.log(`Finished Matches:     ${analysis.matchIds.allFinished.length}`);
  console.log(`Complete Data:        ${analysis.matchIds.withCompleteData.length}`);
  console.log(`High Scoring (8+):    ${analysis.matchIds.highScoring.length}`);
  console.log(`Low Scoring (0-2):    ${analysis.matchIds.lowScoring.length}`);
  console.log('');

  console.log('='.repeat(80) + '\n');
}

/**
 * Save analysis results
 */
function saveResults(
  analysis: FixtureAnalysis,
  goalTiming: GoalTimingData[]
): void {
  const outputDir = path.join(process.cwd(), 'data/uefa-scrape/analysis');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    logger.info(`Created directory: ${outputDir}`);
  }

  // Save analysis
  const analysisPath = path.join(outputDir, 'fixtures-analysis.json');
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
  logger.info(`Saved analysis to: ${analysisPath}`);

  // Save goal timing data
  const goalTimingPath = path.join(outputDir, 'goal-timing-data.json');
  fs.writeFileSync(goalTimingPath, JSON.stringify(goalTiming, null, 2));
  logger.info(`Saved goal timing to: ${goalTimingPath}`);

  // Save match IDs list for easy reference
  const matchIdsPath = path.join(outputDir, 'match-ids.json');
  fs.writeFileSync(matchIdsPath, JSON.stringify(analysis.matchIds, null, 2));
  logger.info(`Saved match IDs to: ${matchIdsPath}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    logger.info('Starting fixture analysis...');
    
    // Load fixtures
    const fixtures = loadFixtures();
    
    // Analyze
    const analysis = analyzeFixtures(fixtures);
    const goalTiming = extractGoalTimingData(fixtures);
    
    // Display results
    displayResults(analysis);
    
    // Save results
    saveResults(analysis, goalTiming);
    
    logger.info('Analysis complete! ✅');
    logger.info(`\nNext steps:`);
    logger.info(`1. Review analysis files in: data/uefa-scrape/analysis/`);
    logger.info(`2. Use match IDs to scrape statistics`);
    logger.info(`3. Run: npm run uefa:scrape-statistics`);
    
  } catch (error) {
    logger.error('Analysis failed:', error);
    process.exit(1);
  }
}

// Run main function
main();

export { analyzeFixtures, loadFixtures, extractGoalTimingData };
