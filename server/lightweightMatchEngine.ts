import type { Player } from "@shared/schema";

/**
 * Lightweight Match Engine
 * Fast simulation for background matches without detailed events
 */

export interface QuickMatchResult {
  homeScore: number;
  awayScore: number;
}

/**
 * Simulate a match quickly without generating events
 * Uses Poisson distribution for realistic score generation
 */
export function simulateQuick(
  homePlayers: Player[],
  awayPlayers: Player[]
): QuickMatchResult {
  // Calculate team strengths
  const homeStrength = calculateTeamStrength(homePlayers) * 1.1; // Home advantage
  const awayStrength = calculateTeamStrength(awayPlayers);

  // Determine expected goals using relative strength
  const totalStrength = homeStrength + awayStrength;
  const homeExpectedGoals = (homeStrength / totalStrength) * 5; // Average 5 goals per game
  const awayExpectedGoals = (awayStrength / totalStrength) * 5;

  // Generate actual goals using Poisson distribution
  const homeScore = poissonRandom(homeExpectedGoals);
  const awayScore = poissonRandom(awayExpectedGoals);

  // Clamp scores to realistic range (0-10)
  return {
    homeScore: Math.min(Math.max(homeScore, 0), 10),
    awayScore: Math.min(Math.max(awayScore, 0), 10),
  };
}

/**
 * Calculate team strength based on player attributes
 * Returns a value typically between 50-150
 */
function calculateTeamStrength(players: Player[]): number {
  if (players.length === 0) return 50;

  // Use current ability as primary rating (0-200 scale)
  const avgAbility = players.reduce((sum, p) => sum + p.currentAbility, 0) / players.length;
  
  // Factor in fitness (0-100 scale, converted to 0-1)
  const avgFitness = players.reduce((sum, p) => sum + p.fitness, 0) / players.length / 100;
  
  // Factor in form (-3 to +3, converted to 0.7-1.3 multiplier)
  const avgForm = players.reduce((sum, p) => sum + p.form, 0) / players.length;
  const formMultiplier = 1 + (avgForm / 10); // -3 = 0.7x, 0 = 1x, +3 = 1.3x
  
  // Factor in morale (0-100 scale, converted to 0.9-1.1 multiplier)
  const avgMorale = players.reduce((sum, p) => sum + p.morale, 0) / players.length;
  const moraleMultiplier = 0.9 + (avgMorale / 100) * 0.2;
  
  // Calculate final strength
  // Base: avgAbility (0-200) * 0.5 = 0-100
  // Then apply fitness, form, and morale multipliers
  const strength = (avgAbility * 0.5) * avgFitness * formMultiplier * moraleMultiplier;
  
  return Math.max(strength, 20); // Minimum strength of 20
}

/**
 * Generate a random number from Poisson distribution
 * Used for realistic goal generation
 */
function poissonRandom(lambda: number): number {
  // Handle edge cases
  if (lambda <= 0) return 0;
  if (lambda > 100) lambda = 100; // Prevent overflow
  
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;

  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 50); // Safety limit

  return k - 1;
}

/**
 * Calculate average team rating (for display purposes)
 * Returns value on 0-20 scale
 */
export function calculateAverageRating(players: Player[]): number {
  if (players.length === 0) return 10;
  
  const avgAbility = players.reduce((sum, p) => sum + p.currentAbility, 0) / players.length;
  return Math.round(avgAbility / 10); // Convert 0-200 to 0-20
}
