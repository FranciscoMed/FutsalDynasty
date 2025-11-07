/**
 * Comprehensive Analysis of UEFA Futsal Data
 * Combines fixtures and statistics to generate insights for match engine
 */

import * as fs from 'fs';
import * as path from 'path';
import { UEFAMatch, MatchStatistics, GoalEvent } from './types';
import { Logger } from './utils/logger';

const logger = new Logger('ComprehensiveAnalysis');

// ============================================================================
// Types for Analysis
// ============================================================================

interface CombinedMatchData {
  matchId: string;
  fixture: UEFAMatch;
  statistics: MatchStatistics;
  scoreDifferential: number;
  competitiveness: 'close' | 'moderate' | 'blowout';
  totalGoals: number;
}

interface SegmentedStats {
  segment: string;
  matchCount: number;
  avgGoals: StatsSummary;
  avgShots: StatsSummary;
  avgShotsOnTarget: StatsSummary;
  avgFouls: StatsSummary;
  avgYellowCards: StatsSummary;
  avgCorners: StatsSummary;
  shotAccuracy: StatsSummary;
  shotsPerGoal: StatsSummary;
}

interface StatsSummary {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  confidenceInterval95: [number, number];
}

interface MinuteDistribution {
  minute: number;
  goals: number;
  probability: number;
  cumulativeProbability: number;
}

interface EventCorrelation {
  name: string;
  correlation: number;
  description: string;
}

interface PositionAnalysis {
  position: string;
  goals: number;
  percentage: number;
  goalsPerMatch: number;
}

interface GameEngineConfig {
  baseStatistics: {
    avgGoalsPerMatch: number;
    avgShotsPerTeam: number;
    avgShotsOnTargetPerTeam: number;
    avgFoulsPerTeam: number;
    avgYellowCardsPerTeam: number;
    avgCornersPerTeam: number;
  };
  probabilities: {
    shotOnTargetToGoal: number;
    shotToSave: number;
    foulToYellowCard: number;
    shotAccuracy: number;
  };
  timingMultipliers: {
    byMinute: Record<number, number>;
    earlyGame: number;    // 0-10 min
    midGame: number;      // 10-30 min
    lateGame: number;     // 30-40 min
  };
  positionModifiers: {
    forward: number;
    defender: number;
    goalkeeper: number;
  };
  qualityAdjustment: {
    ratingDifferenceImpact: number; // per 10 rating points
    maxAdjustment: number;
  };
  homeAdvantage: {
    crowdBoost: number;
    travelPenalty: number;
  };
}

interface ComprehensiveReport {
  metadata: {
    generatedAt: string;
    totalMatches: number;
    dataSource: string;
  };
  segmentedStatistics: SegmentedStats[];
  timingDistributions: {
    goals: MinuteDistribution[];
    firstHalfGoals: number;
    secondHalfGoals: number;
  };
  correlations: EventCorrelation[];
  positionAnalysis: PositionAnalysis[];
  gameEngineConfig: GameEngineConfig;
  insights: string[];
  recommendations: string[];
}

// ============================================================================
// Data Loading
// ============================================================================

function loadFixtures(): UEFAMatch[] {
  const fixturesPath = path.join(process.cwd(), 'data/uefa-scrape/raw/fixtures-all.json');
  const data = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
  return data.matches || [];
}

function loadStatistics(): MatchStatistics[] {
  const statsPath = path.join(process.cwd(), 'data/uefa-scrape/processed/all-statistics.json');
  return JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
}

function loadGoalTimingData(): Array<{ matchId: string; goals: any[] }> {
  const timingPath = path.join(process.cwd(), 'data/uefa-scrape/analysis/goal-timing-data.json');
  return JSON.parse(fs.readFileSync(timingPath, 'utf-8'));
}

// ============================================================================
// Data Combination
// ============================================================================

function combineData(
  fixtures: UEFAMatch[],
  statistics: MatchStatistics[]
): CombinedMatchData[] {
  const statsMap = new Map(statistics.map(s => [s.matchId, s]));
  const combined: CombinedMatchData[] = [];

  for (const fixture of fixtures) {
    const stats = statsMap.get(fixture.id);
    if (!stats) continue;

    const homeGoals = stats.homeTeam.goals;
    const awayGoals = stats.awayTeam.goals;
    const scoreDiff = Math.abs(homeGoals - awayGoals);

    let competitiveness: 'close' | 'moderate' | 'blowout';
    if (scoreDiff <= 2) competitiveness = 'close';
    else if (scoreDiff <= 4) competitiveness = 'moderate';
    else competitiveness = 'blowout';

    combined.push({
      matchId: fixture.id,
      fixture,
      statistics: stats,
      scoreDifferential: scoreDiff,
      competitiveness,
      totalGoals: homeGoals + awayGoals,
    });
  }

  return combined;
}

// ============================================================================
// Statistical Utilities
// ============================================================================

function calculateStats(values: number[]): StatsSummary {
  if (values.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, confidenceInterval95: [0, 0] };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // 95% confidence interval
  const marginOfError = 1.96 * (stdDev / Math.sqrt(values.length));
  const confidenceInterval95: [number, number] = [
    mean - marginOfError,
    mean + marginOfError
  ];

  return {
    mean,
    median,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    confidenceInterval95,
  };
}

// ============================================================================
// Segmented Analysis
// ============================================================================

function analyzeBySegment(
  matches: CombinedMatchData[],
  segmentFilter: (m: CombinedMatchData) => boolean,
  segmentName: string
): SegmentedStats {
  const filtered = matches.filter(segmentFilter);

  const goals = filtered.map(m => m.totalGoals);
  const shotsHome = filtered.map(m => m.statistics.homeTeam.attempts);
  const shotsAway = filtered.map(m => m.statistics.awayTeam.attempts);
  const shots = [...shotsHome, ...shotsAway];
  
  const shotsOnTargetHome = filtered.map(m => m.statistics.homeTeam.attemptsOnTarget);
  const shotsOnTargetAway = filtered.map(m => m.statistics.awayTeam.attemptsOnTarget);
  const shotsOnTarget = [...shotsOnTargetHome, ...shotsOnTargetAway];
  
  const foulsHome = filtered.map(m => m.statistics.homeTeam.foulsCommitted);
  const foulsAway = filtered.map(m => m.statistics.awayTeam.foulsCommitted);
  const fouls = [...foulsHome, ...foulsAway];
  
  const yellowsHome = filtered.map(m => m.statistics.homeTeam.yellowCards);
  const yellowsAway = filtered.map(m => m.statistics.awayTeam.yellowCards);
  const yellows = [...yellowsHome, ...yellowsAway];
  
  const cornersHome = filtered.map(m => m.statistics.homeTeam.corners);
  const cornersAway = filtered.map(m => m.statistics.awayTeam.corners);
  const corners = [...cornersHome, ...cornersAway];
  
  const accuracy = [...shotsHome, ...shotsAway].map((s, i) => {
    const onTarget = [...shotsOnTargetHome, ...shotsOnTargetAway][i];
    return s > 0 ? (onTarget / s) * 100 : 0;
  });
  
  const shotsPerGoalValues = filtered.map(m => {
    const totalShots = m.statistics.homeTeam.attempts + m.statistics.awayTeam.attempts;
    return m.totalGoals > 0 ? totalShots / m.totalGoals : 0;
  });

  return {
    segment: segmentName,
    matchCount: filtered.length,
    avgGoals: calculateStats(goals),
    avgShots: calculateStats(shots),
    avgShotsOnTarget: calculateStats(shotsOnTarget),
    avgFouls: calculateStats(fouls),
    avgYellowCards: calculateStats(yellows),
    avgCorners: calculateStats(corners),
    shotAccuracy: calculateStats(accuracy),
    shotsPerGoal: calculateStats(shotsPerGoalValues),
  };
}

function generateSegmentedAnalysis(matches: CombinedMatchData[]): SegmentedStats[] {
  return [
    analyzeBySegment(matches, () => true, 'All Matches'),
    analyzeBySegment(matches, m => m.competitiveness === 'close', 'Close Matches (0-2 diff)'),
    analyzeBySegment(matches, m => m.competitiveness === 'moderate', 'Moderate (3-4 diff)'),
    analyzeBySegment(matches, m => m.competitiveness === 'blowout', 'Blowouts (5+ diff)'),
    analyzeBySegment(matches, m => m.totalGoals >= 6 && m.totalGoals <= 8, 'Typical (6-8 goals)'),
  ];
}

// ============================================================================
// Timing Analysis
// ============================================================================

function analyzeGoalTiming(goalTimingData: Array<{ matchId: string; goals: any[] }>): {
  goals: MinuteDistribution[];
  firstHalfGoals: number;
  secondHalfGoals: number;
} {
  const goalsByMinute = new Array(41).fill(0); // 0-40 minutes
  let firstHalf = 0;
  let secondHalf = 0;

  for (const match of goalTimingData) {
    for (const goal of match.goals) {
      const minute = Math.floor(goal.minute);
      if (minute >= 0 && minute <= 40) {
        goalsByMinute[minute]++;
      }
      
      if (goal.phase === 'FIRST_HALF') firstHalf++;
      else if (goal.phase === 'SECOND_HALF') secondHalf++;
    }
  }

  const totalGoals = goalsByMinute.reduce((sum, count) => sum + count, 0);
  let cumulative = 0;

  const distribution: MinuteDistribution[] = goalsByMinute.map((count, minute) => {
    const probability = totalGoals > 0 ? count / totalGoals : 0;
    cumulative += probability;
    return {
      minute,
      goals: count,
      probability,
      cumulativeProbability: cumulative,
    };
  });

  return {
    goals: distribution,
    firstHalfGoals: firstHalf,
    secondHalfGoals: secondHalf,
  };
}

// ============================================================================
// Correlation Analysis
// ============================================================================

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

function analyzeCorrelations(matches: CombinedMatchData[]): EventCorrelation[] {
  const correlations: EventCorrelation[] = [];

  // Shots to Goals
  const totalShots = matches.map(m => m.statistics.homeTeam.attempts + m.statistics.awayTeam.attempts);
  const totalGoals = matches.map(m => m.totalGoals);
  correlations.push({
    name: 'Shots to Goals',
    correlation: calculateCorrelation(totalShots, totalGoals),
    description: 'Correlation between total shots and total goals',
  });

  // Shots on Target to Goals
  const shotsOnTarget = matches.map(m => 
    m.statistics.homeTeam.attemptsOnTarget + m.statistics.awayTeam.attemptsOnTarget
  );
  correlations.push({
    name: 'Shots on Target to Goals',
    correlation: calculateCorrelation(shotsOnTarget, totalGoals),
    description: 'Correlation between shots on target and goals scored',
  });

  // Fouls to Yellow Cards
  const totalFouls = matches.map(m => 
    m.statistics.homeTeam.foulsCommitted + m.statistics.awayTeam.foulsCommitted
  );
  const totalYellows = matches.map(m => 
    m.statistics.homeTeam.yellowCards + m.statistics.awayTeam.yellowCards
  );
  correlations.push({
    name: 'Fouls to Yellow Cards',
    correlation: calculateCorrelation(totalFouls, totalYellows),
    description: 'Correlation between fouls committed and yellow cards received',
  });

  // Shot Accuracy to Goals (per team)
  const accuracy: number[] = [];
  const goalsPerTeam: number[] = [];
  matches.forEach(m => {
    [m.statistics.homeTeam, m.statistics.awayTeam].forEach(team => {
      if (team.attempts > 0) {
        accuracy.push((team.attemptsOnTarget / team.attempts) * 100);
        goalsPerTeam.push(team.goals);
      }
    });
  });
  correlations.push({
    name: 'Shot Accuracy to Goals',
    correlation: calculateCorrelation(accuracy, goalsPerTeam),
    description: 'Correlation between shot accuracy percentage and goals scored',
  });

  return correlations;
}

// ============================================================================
// Position Analysis
// ============================================================================

function analyzePositions(goalTimingData: Array<{ matchId: string; goals: any[] }>): PositionAnalysis[] {
  const positionCounts: Record<string, number> = {};
  let totalGoals = 0;

  for (const match of goalTimingData) {
    for (const goal of match.goals) {
      const position = goal.position || 'UNKNOWN';
      positionCounts[position] = (positionCounts[position] || 0) + 1;
      totalGoals++;
    }
  }

  const totalMatches = goalTimingData.length;

  return Object.entries(positionCounts).map(([position, count]) => ({
    position,
    goals: count,
    percentage: (count / totalGoals) * 100,
    goalsPerMatch: count / totalMatches,
  })).sort((a, b) => b.goals - a.goals);
}

// ============================================================================
// Game Engine Configuration
// ============================================================================

function generateGameEngineConfig(
  segmentedStats: SegmentedStats[],
  timingDistribution: MinuteDistribution[],
  positionAnalysis: PositionAnalysis[]
): GameEngineConfig {
  const allMatches = segmentedStats.find(s => s.segment === 'All Matches')!;
  const closeMatches = segmentedStats.find(s => s.segment.includes('Close'))!;

  // Use close matches for baseline (more competitive, realistic for game)
  const baseStats = closeMatches.matchCount > 20 ? closeMatches : allMatches;

  // Calculate timing multipliers
  const avgGoalsPerMinute = timingDistribution.reduce((sum, d) => sum + d.probability, 0) / 41;
  const byMinute: Record<number, number> = {};
  timingDistribution.forEach(d => {
    byMinute[d.minute] = avgGoalsPerMinute > 0 ? d.probability / avgGoalsPerMinute : 1.0;
  });

  // Calculate period multipliers
  const earlyGoals = timingDistribution.slice(0, 10).reduce((sum, d) => sum + d.goals, 0);
  const midGoals = timingDistribution.slice(10, 30).reduce((sum, d) => sum + d.goals, 0);
  const lateGoals = timingDistribution.slice(30, 41).reduce((sum, d) => sum + d.goals, 0);
  const totalGoals = earlyGoals + midGoals + lateGoals;

  const earlyMultiplier = (earlyGoals / 10) / (totalGoals / 41);
  const midMultiplier = (midGoals / 20) / (totalGoals / 41);
  const lateMultiplier = (lateGoals / 11) / (totalGoals / 41);

  // Position modifiers (normalized to sum to 1.0)
  const forwardPos = positionAnalysis.find(p => p.position === 'FORWARD');
  const defenderPos = positionAnalysis.find(p => p.position === 'DEFENDER');
  const gkPos = positionAnalysis.find(p => p.position === 'GOALKEEPER');

  const totalPct = (forwardPos?.percentage || 0) + (defenderPos?.percentage || 0) + (gkPos?.percentage || 0);

  return {
    baseStatistics: {
      avgGoalsPerMatch: baseStats.avgGoals.mean,
      avgShotsPerTeam: baseStats.avgShots.mean,
      avgShotsOnTargetPerTeam: baseStats.avgShotsOnTarget.mean,
      avgFoulsPerTeam: baseStats.avgFouls.mean,
      avgYellowCardsPerTeam: baseStats.avgYellowCards.mean,
      avgCornersPerTeam: baseStats.avgCorners.mean,
    },
    probabilities: {
      shotOnTargetToGoal: baseStats.avgGoals.mean / (baseStats.avgShotsOnTarget.mean * 2), // per team
      shotToSave: 0.35, // Estimated from futsal norms
      foulToYellowCard: baseStats.avgYellowCards.mean / baseStats.avgFouls.mean,
      shotAccuracy: baseStats.shotAccuracy.mean / 100,
    },
    timingMultipliers: {
      byMinute,
      earlyGame: earlyMultiplier,
      midGame: midMultiplier,
      lateGame: lateMultiplier,
    },
    positionModifiers: {
      forward: totalPct > 0 ? (forwardPos?.percentage || 0) / totalPct : 0.645,
      defender: totalPct > 0 ? (defenderPos?.percentage || 0) / totalPct : 0.319,
      goalkeeper: totalPct > 0 ? (gkPos?.percentage || 0) / totalPct : 0.034,
    },
    qualityAdjustment: {
      ratingDifferenceImpact: 0.10, // 10% per 10 rating points
      maxAdjustment: 0.50, // Cap at 50% adjustment
    },
    homeAdvantage: {
      crowdBoost: 1.02, // 2% boost (minimal due to tournament format)
      travelPenalty: 0.98, // 2% penalty for consecutive away games
    },
  };
}

// ============================================================================
// Insights Generation
// ============================================================================

function generateInsights(
  segmentedStats: SegmentedStats[],
  timingDistribution: { goals: MinuteDistribution[]; firstHalfGoals: number; secondHalfGoals: number },
  correlations: EventCorrelation[],
  positionAnalysis: PositionAnalysis[]
): string[] {
  const insights: string[] = [];
  const allMatches = segmentedStats.find(s => s.segment === 'All Matches')!;
  const closeMatches = segmentedStats.find(s => s.segment.includes('Close'));

  // Goal scoring patterns
  insights.push(
    `Average goals per match: ${allMatches.avgGoals.mean.toFixed(2)} (±${allMatches.avgGoals.stdDev.toFixed(2)})`
  );
  
  if (closeMatches) {
    insights.push(
      `Close matches (0-2 diff) average ${closeMatches.avgGoals.mean.toFixed(2)} goals - use this for competitive simulations`
    );
  }

  // Timing patterns
  const totalGoals = timingDistribution.firstHalfGoals + timingDistribution.secondHalfGoals;
  const secondHalfPct = (timingDistribution.secondHalfGoals / totalGoals) * 100;
  insights.push(
    `${secondHalfPct.toFixed(1)}% of goals scored in second half (fatigue effect)`
  );

  const topMinutes = timingDistribution.goals
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 3);
  insights.push(
    `Most dangerous minutes: ${topMinutes.map(m => `${m.minute} (${m.goals} goals)`).join(', ')}`
  );

  // Shot statistics
  insights.push(
    `Teams average ${allMatches.avgShots.mean.toFixed(1)} shots per match with ${allMatches.shotAccuracy.mean.toFixed(1)}% accuracy`
  );
  insights.push(
    `Average ${allMatches.shotsPerGoal.mean.toFixed(1)} shots required per goal`
  );

  // Correlations
  const shotGoalCorr = correlations.find(c => c.name === 'Shots on Target to Goals');
  if (shotGoalCorr) {
    insights.push(
      `Shots on target strongly correlate with goals (r=${shotGoalCorr.correlation.toFixed(2)})`
    );
  }

  // Position insights
  const forwardGoals = positionAnalysis.find(p => p.position === 'FORWARD');
  if (forwardGoals) {
    insights.push(
      `Forwards score ${forwardGoals.percentage.toFixed(1)}% of goals (${forwardGoals.goalsPerMatch.toFixed(2)} per match)`
    );
  }

  // Disciplinary
  insights.push(
    `Average ${allMatches.avgFouls.mean.toFixed(1)} fouls and ${allMatches.avgYellowCards.mean.toFixed(1)} yellow cards per team`
  );

  return insights;
}

function generateRecommendations(): string[] {
  return [
    'Use "Close Matches" statistics for competitive league simulations',
    'Apply timing multipliers: 1.3x for late game (min 35-40), 1.1x for early game (min 0-10)',
    'Set home advantage to minimal 2-3% (tournament format skews data)',
    'Use team quality ratings as primary factor for expected goals, not venue',
    'Apply position modifiers conservatively: Forward base with ±10% tactical adjustments',
    'Shots on target have ~30% goal conversion rate in close matches',
    'Yellow card probability: ~12% per foul committed',
    'Second half should have 1.3x goal frequency vs first half',
    'Goalkeeper goals (fly goalkeeper) occur in ~3-4% of total goals',
    'Shot accuracy should average 32-35% across all teams',
  ];
}

// ============================================================================
// Main Analysis
// ============================================================================

async function main() {
  try {
    logger.info('Starting comprehensive UEFA data analysis...\n');

    // Load data
    logger.info('Loading data...');
    const fixtures = loadFixtures();
    const statistics = loadStatistics();
    const goalTimingData = loadGoalTimingData();
    logger.info(`Loaded ${fixtures.length} fixtures, ${statistics.length} statistics, ${goalTimingData.length} timing records\n`);

    // Combine data
    logger.info('Combining fixtures and statistics...');
    const combinedData = combineData(fixtures, statistics);
    logger.info(`Combined ${combinedData.length} matches\n`);

    // Segmented analysis
    logger.info('Generating segmented statistics...');
    const segmentedStats = generateSegmentedAnalysis(combinedData);
    logger.info(`Generated ${segmentedStats.length} segments\n`);

    // Timing analysis
    logger.info('Analyzing goal timing patterns...');
    const timingDistribution = analyzeGoalTiming(goalTimingData);
    logger.info(`Analyzed ${timingDistribution.goals.reduce((s, d) => s + d.goals, 0)} goals\n`);

    // Correlations
    logger.info('Calculating event correlations...');
    const correlations = analyzeCorrelations(combinedData);
    logger.info(`Calculated ${correlations.length} correlations\n`);

    // Position analysis
    logger.info('Analyzing goals by position...');
    const positionAnalysis = analyzePositions(goalTimingData);
    logger.info(`Analyzed ${positionAnalysis.length} positions\n`);

    // Game engine config
    logger.info('Generating game engine configuration...');
    const gameEngineConfig = generateGameEngineConfig(segmentedStats, timingDistribution.goals, positionAnalysis);
    logger.info('Configuration generated\n');

    // Insights
    logger.info('Generating insights and recommendations...');
    const insights = generateInsights(segmentedStats, timingDistribution, correlations, positionAnalysis);
    const recommendations = generateRecommendations();
    logger.info(`Generated ${insights.length} insights and ${recommendations.length} recommendations\n`);

    // Create comprehensive report
    const report: ComprehensiveReport = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalMatches: combinedData.length,
        dataSource: 'UEFA Futsal Champions League 2023/24 & 2024/25',
      },
      segmentedStatistics: segmentedStats,
      timingDistributions: timingDistribution,
      correlations,
      positionAnalysis,
      gameEngineConfig,
      insights,
      recommendations,
    };

    // Save results
    const outputDir = path.join(process.cwd(), 'data/uefa-scrape/analysis');
    const reportPath = path.join(outputDir, 'comprehensive-analysis.json');
    const configPath = path.join(outputDir, 'game-engine-config.json');

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(configPath, JSON.stringify(gameEngineConfig, null, 2));

    logger.info(`\n${'='.repeat(80)}`);
    logger.info('ANALYSIS COMPLETE');
    logger.info('='.repeat(80));
    logger.info(`\nSaved comprehensive report to: ${reportPath}`);
    logger.info(`Saved game engine config to: ${configPath}`);

    // Display summary
    displaySummary(report);

    logger.info('\n✅ Phase 3 Complete!');
    logger.info('\nNext steps:');
    logger.info('1. Review comprehensive-analysis.json for detailed insights');
    logger.info('2. Review game-engine-config.json for integration parameters');
    logger.info('3. Integrate configuration into match engine');
    logger.info('4. Run validation tests comparing simulated vs real matches\n');

  } catch (error) {
    logger.error('Analysis failed:', error);
    process.exit(1);
  }
}

function displaySummary(report: ComprehensiveReport) {
  console.log('\n' + '='.repeat(80));
  console.log('COMPREHENSIVE ANALYSIS SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log('📊 DATASET');
  console.log('-'.repeat(80));
  console.log(`Total Matches: ${report.metadata.totalMatches}`);
  console.log(`Data Source: ${report.metadata.dataSource}`);
  console.log('');

  console.log('📈 KEY STATISTICS (All Matches)');
  console.log('-'.repeat(80));
  const allStats = report.segmentedStatistics.find(s => s.segment === 'All Matches')!;
  console.log(`Goals per Match:      ${allStats.avgGoals.mean.toFixed(2)} ± ${allStats.avgGoals.stdDev.toFixed(2)}`);
  console.log(`Shots per Team:       ${allStats.avgShots.mean.toFixed(2)}`);
  console.log(`Shot Accuracy:        ${allStats.shotAccuracy.mean.toFixed(1)}%`);
  console.log(`Shots per Goal:       ${allStats.shotsPerGoal.mean.toFixed(1)}`);
  console.log(`Fouls per Team:       ${allStats.avgFouls.mean.toFixed(1)}`);
  console.log(`Yellow Cards:         ${allStats.avgYellowCards.mean.toFixed(2)}`);
  console.log('');

  console.log('🎯 SEGMENTED ANALYSIS');
  console.log('-'.repeat(80));
  report.segmentedStatistics.forEach(seg => {
    if (seg.segment !== 'All Matches') {
      console.log(`${seg.segment}: ${seg.avgGoals.mean.toFixed(2)} goals (${seg.matchCount} matches)`);
    }
  });
  console.log('');

  console.log('⏱️  TIMING PATTERNS');
  console.log('-'.repeat(80));
  const totalGoals = report.timingDistributions.firstHalfGoals + report.timingDistributions.secondHalfGoals;
  console.log(`First Half:  ${report.timingDistributions.firstHalfGoals} (${(report.timingDistributions.firstHalfGoals / totalGoals * 100).toFixed(1)}%)`);
  console.log(`Second Half: ${report.timingDistributions.secondHalfGoals} (${(report.timingDistributions.secondHalfGoals / totalGoals * 100).toFixed(1)}%)`);
  
  const top3 = report.timingDistributions.goals.sort((a, b) => b.goals - a.goals).slice(0, 3);
  console.log(`\nTop Minutes: ${top3.map(m => `${m.minute}'`).join(', ')}`);
  console.log('');

  console.log('🔗 CORRELATIONS');
  console.log('-'.repeat(80));
  report.correlations.forEach(corr => {
    console.log(`${corr.name}: r=${corr.correlation.toFixed(3)}`);
  });
  console.log('');

  console.log('⚽ POSITION ANALYSIS');
  console.log('-'.repeat(80));
  report.positionAnalysis.forEach(pos => {
    console.log(`${pos.position}: ${pos.percentage.toFixed(1)}% (${pos.goals} goals)`);
  });
  console.log('');

  console.log('💡 KEY INSIGHTS');
  console.log('-'.repeat(80));
  report.insights.slice(0, 5).forEach((insight, i) => {
    console.log(`${i + 1}. ${insight}`);
  });
  console.log('');

  console.log('='.repeat(80) + '\n');
}

// Run analysis
main();
