# Player & Team Statistics Implementation Plan

**Goal:** Track and display comprehensive player and team statistics throughout the season  
**Focus:** Season stats, competition stats, career records, top scorers, assists, clean sheets  
**Date:** November 12, 2025

---

## 🎯 Overview

The match engine already generates **all** match events including:
- Goals with assists tracked (`assistId`, `assistName`)
- Yellow and red cards (`yellowCards`, `redCards` on Player)
- Shots, saves, tackles, interceptions, blocks, dribbles, fouls
- Player ratings per match (`playerRatings` in Match)

**What we need:** Aggregate these per-player and per-team statistics for:
1. Season totals (goals, assists, cards, appearances, ratings)
2. Competition-specific stats
3. Career records
4. Team aggregations (top scorer, most assists, clean sheets, discipline)

---

## 📊 Current State Analysis

### ✅ Already Available in Codebase

**Player Schema (`shared/schema.ts`):**
```typescript
interface Player {
  // ... existing fields ...
  yellowCards: number;      // ✅ Already tracked (season total)
  redCards: number;          // ✅ Already tracked (season total)
  // ❌ Missing: goals, assists, cleanSheets, appearances, averageRating
}
```

**Match Schema:**
```typescript
interface Match {
  events: MatchEvent[];      // ✅ All match events with goals, assists, cards
  playerRatings: Record<number, number>;  // ✅ Player ratings per match
  homeStats: MatchStats;     // ✅ Team statistics
  awayStats: MatchStats;     // ✅ Team statistics
}

interface MatchEvent {
  type: "goal" | "shot" | "tackle" | ... ;
  playerId: number;
  playerName: string;
  assistId?: number;         // ✅ Assists tracked
  assistName?: string;
  // ... other fields ...
}
```

**Match Engine (`server/matchEngine.ts`):**
- ✅ Generates goal events with `assistId` and `assistName`
- ✅ Tracks yellow/red cards
- ✅ Calculates player ratings (6.0-10.0)
- ✅ Records all events in match.events array

### ❌ What's Missing

1. **Player season statistics** (goals, assists, appearances, cleanSheets, averageRating)
2. **Player competition-specific statistics**
3. **Statistics aggregation engine**
4. **API endpoints for statistics queries**
5. **Frontend statistics display pages**

---

## 🏗️ Database Schema Changes

### 1. Add Player Statistics Fields

**Update `shared/schema.ts` - Player interface:**

```typescript
export interface PlayerSeasonStats {
  season: number;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;        // For goalkeepers
  totalMinutesPlayed: number;
  averageRating: number;
  shotsTotal: number;
  shotsOnTarget: number;
  passesTotal: number;
  tacklesTotal: number;
  interceptionsTotal: number;
}

export interface PlayerCompetitionStats {
  competitionId: number;
  competitionName: string;
  season: number;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
  averageRating: number;
}

export interface Player {
  // ... existing fields ...
  
  // NEW: Season statistics
  seasonStats: PlayerSeasonStats;
  
  // NEW: Competition-specific statistics
  competitionStats: PlayerCompetitionStats[];
  
  // NEW: Career totals (across all seasons)
  careerStats: {
    totalAppearances: number;
    totalGoals: number;
    totalAssists: number;
    totalYellowCards: number;
    totalRedCards: number;
    totalCleanSheets: number;
  };
}
```

**Update database schema (`players` table):**

```typescript
export const players = pgTable("players", {
  // ... existing columns ...
  
  // NEW: Season statistics (JSONB)
  seasonStats: jsonb("season_stats")
    .notNull()
    .$type<PlayerSeasonStats>()
    .default({
      season: 1,
      appearances: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      cleanSheets: 0,
      totalMinutesPlayed: 0,
      averageRating: 0,
      shotsTotal: 0,
      shotsOnTarget: 0,
      passesTotal: 0,
      tacklesTotal: 0,
      interceptionsTotal: 0,
    }),
  
  // NEW: Competition statistics (JSONB array)
  competitionStats: jsonb("competition_stats")
    .notNull()
    .$type<PlayerCompetitionStats[]>()
    .default([]),
  
  // NEW: Career totals (JSONB)
  careerStats: jsonb("career_stats")
    .notNull()
    .$type<{
      totalAppearances: number;
      totalGoals: number;
      totalAssists: number;
      totalYellowCards: number;
      totalRedCards: number;
      totalCleanSheets: number;
    }>()
    .default({
      totalAppearances: 0,
      totalGoals: 0,
      totalAssists: 0,
      totalYellowCards: 0,
      totalRedCards: 0,
      totalCleanSheets: 0,
    }),
});
```

### 2. Create Statistics Engine

**Create `server/statisticsEngine.ts`:**

```typescript
import type { IStorage } from "./storage";
import type { Match, Player, PlayerSeasonStats, PlayerCompetitionStats } from "@shared/schema";

export class StatisticsEngine {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Update player statistics after a match is played
   * Called by matchEngine after match simulation completes
   */
  async updatePlayerStatistics(
    saveGameId: number,
    userId: number,
    match: Match
  ): Promise<void> {
    // Get all players involved in the match
    const homeTeam = await this.storage.getTeam(saveGameId, userId, match.homeTeamId);
    const awayTeam = await this.storage.getTeam(saveGameId, userId, match.awayTeamId);
    const homePlayers = await this.storage.getPlayers(saveGameId, userId, match.homeTeamId);
    const awayPlayers = await this.storage.getPlayers(saveGameId, userId, match.awayTeamId);

    // Process all players who played (have a rating)
    const playersWithRatings = Object.keys(match.playerRatings).map(Number);

    for (const playerId of playersWithRatings) {
      const player = [...homePlayers, ...awayPlayers].find(p => p.id === playerId);
      if (!player) continue;

      // Calculate statistics from match events
      const stats = this.calculatePlayerMatchStats(player.id, match);

      // Update player's season stats
      await this.updateSeasonStats(saveGameId, userId, player, stats, match);

      // Update player's competition stats
      await this.updateCompetitionStats(saveGameId, userId, player, stats, match);

      // Update career stats
      await this.updateCareerStats(saveGameId, userId, player, stats);
    }
  }

  /**
   * Calculate player statistics from a single match
   */
  private calculatePlayerMatchStats(
    playerId: number,
    match: Match
  ): {
    goals: number;
    assists: number;
    shots: number;
    shotsOnTarget: number;
    tackles: number;
    interceptions: number;
    fouls: number;
    yellowCards: number;
    redCards: number;
    rating: number;
  } {
    const stats = {
      goals: 0,
      assists: 0,
      shots: 0,
      shotsOnTarget: 0,
      tackles: 0,
      interceptions: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      rating: match.playerRatings[playerId] || 0,
    };

    // Count events for this player
    for (const event of match.events) {
      if (event.playerId === playerId) {
        switch (event.type) {
          case 'goal':
            stats.goals++;
            break;
          case 'shot':
            stats.shots++;
            if (event.shotQuality && event.shotQuality > 0.5) {
              stats.shotsOnTarget++;
            }
            break;
          case 'tackle':
            stats.tackles++;
            break;
          case 'interception':
            stats.interceptions++;
            break;
          case 'foul':
            stats.fouls++;
            break;
          case 'yellow_card':
            stats.yellowCards++;
            break;
          case 'red_card':
            stats.redCards++;
            break;
        }
      }

      // Check for assists
      if (event.type === 'goal' && event.assistId === playerId) {
        stats.assists++;
      }
    }

    return stats;
  }

  /**
   * Update player's season statistics
   */
  private async updateSeasonStats(
    saveGameId: number,
    userId: number,
    player: Player,
    matchStats: any,
    match: Match
  ): Promise<void> {
    const currentSeason = await this.getCurrentSeason(saveGameId, userId);

    // Initialize if not exists
    if (!player.seasonStats || player.seasonStats.season !== currentSeason) {
      player.seasonStats = {
        season: currentSeason,
        appearances: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        cleanSheets: 0,
        totalMinutesPlayed: 0,
        averageRating: 0,
        shotsTotal: 0,
        shotsOnTarget: 0,
        passesTotal: 0,
        tacklesTotal: 0,
        interceptionsTotal: 0,
      };
    }

    // Update statistics
    player.seasonStats.appearances++;
    player.seasonStats.goals += matchStats.goals;
    player.seasonStats.assists += matchStats.assists;
    player.seasonStats.yellowCards += matchStats.yellowCards;
    player.seasonStats.redCards += matchStats.redCards;
    player.seasonStats.shotsTotal += matchStats.shots;
    player.seasonStats.shotsOnTarget += matchStats.shotsOnTarget;
    player.seasonStats.tacklesTotal += matchStats.tackles;
    player.seasonStats.interceptionsTotal += matchStats.interceptions;
    player.seasonStats.totalMinutesPlayed += 40; // Full match (40 minutes in futsal)

    // Check for clean sheet (goalkeeper only, team didn't concede)
    if (player.position === 'Goalkeeper') {
      const teamConceded = player.teamId === match.homeTeamId 
        ? match.awayScore 
        : match.homeScore;
      if (teamConceded === 0) {
        player.seasonStats.cleanSheets++;
      }
    }

    // Recalculate average rating
    const totalRating = (player.seasonStats.averageRating * (player.seasonStats.appearances - 1)) + matchStats.rating;
    player.seasonStats.averageRating = totalRating / player.seasonStats.appearances;

    // Save updated player
    await this.storage.updatePlayer(saveGameId, userId, player.id, player);
  }

  /**
   * Update player's competition-specific statistics
   */
  private async updateCompetitionStats(
    saveGameId: number,
    userId: number,
    player: Player,
    matchStats: any,
    match: Match
  ): Promise<void> {
    const currentSeason = await this.getCurrentSeason(saveGameId, userId);
    const competition = await this.storage.getCompetition(saveGameId, userId, match.competitionId);

    // Find or create competition stats entry
    let compStats = player.competitionStats.find(
      cs => cs.competitionId === match.competitionId && cs.season === currentSeason
    );

    if (!compStats) {
      compStats = {
        competitionId: match.competitionId,
        competitionName: competition.name,
        season: currentSeason,
        appearances: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        cleanSheets: 0,
        averageRating: 0,
      };
      player.competitionStats.push(compStats);
    }

    // Update competition statistics
    compStats.appearances++;
    compStats.goals += matchStats.goals;
    compStats.assists += matchStats.assists;
    compStats.yellowCards += matchStats.yellowCards;
    compStats.redCards += matchStats.redCards;

    // Check for clean sheet
    if (player.position === 'Goalkeeper') {
      const teamConceded = player.teamId === match.homeTeamId 
        ? match.awayScore 
        : match.homeScore;
      if (teamConceded === 0) {
        compStats.cleanSheets++;
      }
    }

    // Recalculate average rating
    const totalRating = (compStats.averageRating * (compStats.appearances - 1)) + matchStats.rating;
    compStats.averageRating = totalRating / compStats.appearances;

    // Save updated player
    await this.storage.updatePlayer(saveGameId, userId, player.id, player);
  }

  /**
   * Update player's career statistics
   */
  private async updateCareerStats(
    saveGameId: number,
    userId: number,
    player: Player,
    matchStats: any
  ): Promise<void> {
    // Initialize if not exists
    if (!player.careerStats) {
      player.careerStats = {
        totalAppearances: 0,
        totalGoals: 0,
        totalAssists: 0,
        totalYellowCards: 0,
        totalRedCards: 0,
        totalCleanSheets: 0,
      };
    }

    // Update career totals
    player.careerStats.totalAppearances++;
    player.careerStats.totalGoals += matchStats.goals;
    player.careerStats.totalAssists += matchStats.assists;
    player.careerStats.totalYellowCards += matchStats.yellowCards;
    player.careerStats.totalRedCards += matchStats.redCards;

    // Check for clean sheet (goalkeeper only)
    if (player.position === 'Goalkeeper' && matchStats.cleanSheet) {
      player.careerStats.totalCleanSheets++;
    }

    // Save updated player
    await this.storage.updatePlayer(saveGameId, userId, player.id, player);
  }

  /**
   * Get top scorers for a competition
   */
  async getTopScorers(
    saveGameId: number,
    userId: number,
    competitionId: number,
    limit: number = 10
  ): Promise<Array<{ player: Player; goals: number; assists: number }>> {
    const currentSeason = await this.getCurrentSeason(saveGameId, userId);
    const allPlayers = await this.getAllPlayersInSaveGame(saveGameId, userId);

    // Filter and map players with goals in this competition
    const scorers = allPlayers
      .map(player => {
        const compStats = player.competitionStats.find(
          cs => cs.competitionId === competitionId && cs.season === currentSeason
        );
        return {
          player,
          goals: compStats?.goals || 0,
          assists: compStats?.assists || 0,
        };
      })
      .filter(s => s.goals > 0)
      .sort((a, b) => {
        // Sort by goals (primary), then assists (tiebreaker)
        if (b.goals !== a.goals) return b.goals - a.goals;
        return b.assists - a.assists;
      })
      .slice(0, limit);

    return scorers;
  }

  /**
   * Get top assisters for a competition
   */
  async getTopAssisters(
    saveGameId: number,
    userId: number,
    competitionId: number,
    limit: number = 10
  ): Promise<Array<{ player: Player; assists: number; goals: number }>> {
    const currentSeason = await this.getCurrentSeason(saveGameId, userId);
    const allPlayers = await this.getAllPlayersInSaveGame(saveGameId, userId);

    const assisters = allPlayers
      .map(player => {
        const compStats = player.competitionStats.find(
          cs => cs.competitionId === competitionId && cs.season === currentSeason
        );
        return {
          player,
          assists: compStats?.assists || 0,
          goals: compStats?.goals || 0,
        };
      })
      .filter(a => a.assists > 0)
      .sort((a, b) => {
        if (b.assists !== a.assists) return b.assists - a.assists;
        return b.goals - a.goals;
      })
      .slice(0, limit);

    return assisters;
  }

  /**
   * Get goalkeepers with most clean sheets
   */
  async getTopCleanSheets(
    saveGameId: number,
    userId: number,
    competitionId: number,
    limit: number = 10
  ): Promise<Array<{ player: Player; cleanSheets: number; appearances: number }>> {
    const currentSeason = await this.getCurrentSeason(saveGameId, userId);
    const allPlayers = await this.getAllPlayersInSaveGame(saveGameId, userId);

    const goalkeepers = allPlayers
      .filter(p => p.position === 'Goalkeeper')
      .map(player => {
        const compStats = player.competitionStats.find(
          cs => cs.competitionId === competitionId && cs.season === currentSeason
        );
        return {
          player,
          cleanSheets: compStats?.cleanSheets || 0,
          appearances: compStats?.appearances || 0,
        };
      })
      .filter(g => g.cleanSheets > 0)
      .sort((a, b) => b.cleanSheets - a.cleanSheets)
      .slice(0, limit);

    return goalkeepers;
  }

  /**
   * Get team form (last 5 matches)
   */
  async getTeamForm(
    saveGameId: number,
    userId: number,
    teamId: number,
    competitionId?: number
  ): Promise<{ form: ('W' | 'D' | 'L')[]; points: number }> {
    const matches = await this.storage.getMatches(saveGameId, userId);

    // Filter matches for this team
    let teamMatches = matches.filter(
      m => m.played && (m.homeTeamId === teamId || m.awayTeamId === teamId)
    );

    // Filter by competition if specified
    if (competitionId) {
      teamMatches = teamMatches.filter(m => m.competitionId === competitionId);
    }

    // Sort by date (most recent first)
    teamMatches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Take last 5 matches
    const last5 = teamMatches.slice(0, 5).reverse();

    const form: ('W' | 'D' | 'L')[] = [];
    let points = 0;

    for (const match of last5) {
      const isHome = match.homeTeamId === teamId;
      const teamScore = isHome ? match.homeScore : match.awayScore;
      const opponentScore = isHome ? match.awayScore : match.homeScore;

      if (teamScore > opponentScore) {
        form.push('W');
        points += 3;
      } else if (teamScore === opponentScore) {
        form.push('D');
        points += 1;
      } else {
        form.push('L');
      }
    }

    return { form, points };
  }

  /**
   * Get discipline statistics (cards) for a competition
   */
  async getDisciplineStats(
    saveGameId: number,
    userId: number,
    competitionId: number
  ): Promise<Array<{
    player: Player;
    yellowCards: number;
    redCards: number;
    totalCards: number;
  }>> {
    const currentSeason = await this.getCurrentSeason(saveGameId, userId);
    const allPlayers = await this.getAllPlayersInSaveGame(saveGameId, userId);

    const discipline = allPlayers
      .map(player => {
        const compStats = player.competitionStats.find(
          cs => cs.competitionId === competitionId && cs.season === currentSeason
        );
        const yellowCards = compStats?.yellowCards || 0;
        const redCards = compStats?.redCards || 0;
        return {
          player,
          yellowCards,
          redCards,
          totalCards: yellowCards + redCards * 2, // Red card = 2 yellows for sorting
        };
      })
      .filter(d => d.totalCards > 0)
      .sort((a, b) => b.totalCards - a.totalCards);

    return discipline;
  }

  // Helper methods
  private async getCurrentSeason(saveGameId: number, userId: number): Promise<number> {
    const gameState = await this.storage.getGameState(saveGameId, userId);
    return gameState.season;
  }

  private async getAllPlayersInSaveGame(saveGameId: number, userId: number): Promise<Player[]> {
    const teams = await this.storage.getTeams(saveGameId, userId);
    const allPlayers: Player[] = [];

    for (const team of teams) {
      const players = await this.storage.getPlayers(saveGameId, userId, team.id);
      allPlayers.push(...players);
    }

    return allPlayers;
  }
}
```

---

## 🔌 Integration Points

### 1. Match Engine Integration

**Update `server/matchEngine.ts`:**

```typescript
import { StatisticsEngine } from './statisticsEngine';

export class MatchEngine {
  private storage: IStorage;
  private traitEngine: TraitEngine;
  private statisticsEngine: StatisticsEngine; // NEW

  constructor(storage: IStorage) {
    this.storage = storage;
    this.traitEngine = new TraitEngine();
    this.statisticsEngine = new StatisticsEngine(storage); // NEW
  }

  async simulateMatch(
    saveGameId: number,
    userId: number,
    matchId: number,
    realTime: boolean = false
  ): Promise<Match> {
    // ... existing simulation logic ...

    // NEW: Update player statistics after match completion
    await this.statisticsEngine.updatePlayerStatistics(saveGameId, userId, updatedMatch);

    return updatedMatch;
  }
}
```

### 2. API Routes

**Add to `server/routes.ts`:**

```typescript
// Statistics routes
app.get('/api/statistics/top-scorers/:competitionId', async (req, res) => {
  try {
    const { competitionId } = req.params;
    const { limit = 10 } = req.query;
    
    const statisticsEngine = new StatisticsEngine(storage);
    const topScorers = await statisticsEngine.getTopScorers(
      req.session.activeSaveGameId!,
      req.session.userId!,
      parseInt(competitionId),
      parseInt(limit as string)
    );
    
    res.json(topScorers);
  } catch (error) {
    console.error('Error fetching top scorers:', error);
    res.status(500).json({ error: 'Failed to fetch top scorers' });
  }
});

app.get('/api/statistics/top-assisters/:competitionId', async (req, res) => {
  try {
    const { competitionId } = req.params;
    const { limit = 10 } = req.query;
    
    const statisticsEngine = new StatisticsEngine(storage);
    const topAssisters = await statisticsEngine.getTopAssisters(
      req.session.activeSaveGameId!,
      req.session.userId!,
      parseInt(competitionId),
      parseInt(limit as string)
    );
    
    res.json(topAssisters);
  } catch (error) {
    console.error('Error fetching top assisters:', error);
    res.status(500).json({ error: 'Failed to fetch top assisters' });
  }
});

app.get('/api/statistics/clean-sheets/:competitionId', async (req, res) => {
  try {
    const { competitionId } = req.params;
    const { limit = 10 } = req.query;
    
    const statisticsEngine = new StatisticsEngine(storage);
    const topCleanSheets = await statisticsEngine.getTopCleanSheets(
      req.session.activeSaveGameId!,
      req.session.userId!,
      parseInt(competitionId),
      parseInt(limit as string)
    );
    
    res.json(topCleanSheets);
  } catch (error) {
    console.error('Error fetching clean sheets:', error);
    res.status(500).json({ error: 'Failed to fetch clean sheets' });
  }
});

app.get('/api/statistics/discipline/:competitionId', async (req, res) => {
  try {
    const { competitionId } = req.params;
    
    const statisticsEngine = new StatisticsEngine(storage);
    const disciplineStats = await statisticsEngine.getDisciplineStats(
      req.session.activeSaveGameId!,
      req.session.userId!,
      parseInt(competitionId)
    );
    
    res.json(disciplineStats);
  } catch (error) {
    console.error('Error fetching discipline stats:', error);
    res.status(500).json({ error: 'Failed to fetch discipline stats' });
  }
});

app.get('/api/statistics/form/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { competitionId } = req.query;
    
    const statisticsEngine = new StatisticsEngine(storage);
    const form = await statisticsEngine.getTeamForm(
      req.session.activeSaveGameId!,
      req.session.userId!,
      parseInt(teamId),
      competitionId ? parseInt(competitionId as string) : undefined
    );
    
    res.json(form);
  } catch (error) {
    console.error('Error fetching team form:', error);
    res.status(500).json({ error: 'Failed to fetch team form' });
  }
});

app.get('/api/statistics/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    
    const player = await storage.getPlayer(
      req.session.activeSaveGameId!,
      parseInt(playerId)
    );
    
    res.json({
      seasonStats: player.seasonStats,
      competitionStats: player.competitionStats,
      careerStats: player.careerStats,
    });
  } catch (error) {
    console.error('Error fetching player statistics:', error);
    res.status(500).json({ error: 'Failed to fetch player statistics' });
  }
});
```

---

## 🎨 Frontend Implementation

### 1. TanStack Query Hooks

**Add to `client/src/hooks/useServerState.ts`:**

```typescript
// Statistics hooks
export function useTopScorers(competitionId: number, limit: number = 10) {
  return useQuery({
    queryKey: ['statistics', 'top-scorers', competitionId, limit],
    queryFn: async () => {
      const response = await fetch(`/api/statistics/top-scorers/${competitionId}?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch top scorers');
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function useTopAssisters(competitionId: number, limit: number = 10) {
  return useQuery({
    queryKey: ['statistics', 'top-assisters', competitionId, limit],
    queryFn: async () => {
      const response = await fetch(`/api/statistics/top-assisters/${competitionId}?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch top assisters');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useTopCleanSheets(competitionId: number, limit: number = 10) {
  return useQuery({
    queryKey: ['statistics', 'clean-sheets', competitionId, limit],
    queryFn: async () => {
      const response = await fetch(`/api/statistics/clean-sheets/${competitionId}?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch clean sheets');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useDisciplineStats(competitionId: number) {
  return useQuery({
    queryKey: ['statistics', 'discipline', competitionId],
    queryFn: async () => {
      const response = await fetch(`/api/statistics/discipline/${competitionId}`);
      if (!response.ok) throw new Error('Failed to fetch discipline stats');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useTeamForm(teamId: number, competitionId?: number) {
  return useQuery({
    queryKey: ['statistics', 'form', teamId, competitionId],
    queryFn: async () => {
      const url = competitionId 
        ? `/api/statistics/form/${teamId}?competitionId=${competitionId}`
        : `/api/statistics/form/${teamId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch team form');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function usePlayerStatistics(playerId: number) {
  return useQuery({
    queryKey: ['statistics', 'player', playerId],
    queryFn: async () => {
      const response = await fetch(`/api/statistics/player/${playerId}`);
      if (!response.ok) throw new Error('Failed to fetch player statistics');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}
```

### 2. Statistics Page Component

**Create `client/src/pages/StatisticsPage.tsx`:**

```typescript
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Trophy, Target, Shield, AlertTriangle } from 'lucide-react';
import { useTopScorers, useTopAssisters, useTopCleanSheets, useDisciplineStats } from '@/hooks/useServerState';
import { useGameState } from '@/hooks/useServerState';

export default function StatisticsPage() {
  const { data: gameState } = useGameState();
  const [selectedCompetition, setSelectedCompetition] = useState<number>(1); // Default to First Division

  const { data: topScorers, isLoading: loadingScorers } = useTopScorers(selectedCompetition, 10);
  const { data: topAssisters, isLoading: loadingAssisters } = useTopAssisters(selectedCompetition, 10);
  const { data: topCleanSheets, isLoading: loadingCleanSheets } = useTopCleanSheets(selectedCompetition, 10);
  const { data: disciplineStats, isLoading: loadingDiscipline } = useDisciplineStats(selectedCompetition);

  if (!gameState) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Statistics</h1>
        
        {/* Competition selector */}
        <select 
          value={selectedCompetition}
          onChange={(e) => setSelectedCompetition(parseInt(e.target.value))}
          className="px-4 py-2 border rounded-md"
        >
          {gameState.competitions.map(comp => (
            <option key={comp.id} value={comp.id}>{comp.name}</option>
          ))}
        </select>
      </div>

      <Tabs defaultValue="scorers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scorers">
            <Trophy className="w-4 h-4 mr-2" />
            Top Scorers
          </TabsTrigger>
          <TabsTrigger value="assisters">
            <Target className="w-4 h-4 mr-2" />
            Top Assisters
          </TabsTrigger>
          <TabsTrigger value="goalkeepers">
            <Shield className="w-4 h-4 mr-2" />
            Clean Sheets
          </TabsTrigger>
          <TabsTrigger value="discipline">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Discipline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scorers">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Top Scorers</h2>
            {loadingScorers ? (
              <div>Loading...</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Rank</th>
                    <th className="text-left p-2">Player</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">Goals</th>
                    <th className="text-center p-2">Assists</th>
                  </tr>
                </thead>
                <tbody>
                  {topScorers?.map((scorer, index) => (
                    <tr key={scorer.player.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-bold">{index + 1}</td>
                      <td className="p-2">{scorer.player.name}</td>
                      <td className="p-2 text-gray-600">Team Name</td>
                      <td className="p-2 text-center font-bold text-green-600">{scorer.goals}</td>
                      <td className="p-2 text-center text-gray-600">{scorer.assists}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="assisters">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Top Assisters</h2>
            {loadingAssisters ? (
              <div>Loading...</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Rank</th>
                    <th className="text-left p-2">Player</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">Assists</th>
                    <th className="text-center p-2">Goals</th>
                  </tr>
                </thead>
                <tbody>
                  {topAssisters?.map((assister, index) => (
                    <tr key={assister.player.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-bold">{index + 1}</td>
                      <td className="p-2">{assister.player.name}</td>
                      <td className="p-2 text-gray-600">Team Name</td>
                      <td className="p-2 text-center font-bold text-blue-600">{assister.assists}</td>
                      <td className="p-2 text-center text-gray-600">{assister.goals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="goalkeepers">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Goalkeepers - Clean Sheets</h2>
            {loadingCleanSheets ? (
              <div>Loading...</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Rank</th>
                    <th className="text-left p-2">Goalkeeper</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">Clean Sheets</th>
                    <th className="text-center p-2">Appearances</th>
                  </tr>
                </thead>
                <tbody>
                  {topCleanSheets?.map((gk, index) => (
                    <tr key={gk.player.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-bold">{index + 1}</td>
                      <td className="p-2">{gk.player.name}</td>
                      <td className="p-2 text-gray-600">Team Name</td>
                      <td className="p-2 text-center font-bold text-green-600">{gk.cleanSheets}</td>
                      <td className="p-2 text-center text-gray-600">{gk.appearances}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="discipline">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">Discipline - Cards</h2>
            {loadingDiscipline ? (
              <div>Loading...</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Rank</th>
                    <th className="text-left p-2">Player</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">🟨 Yellow</th>
                    <th className="text-center p-2">🟥 Red</th>
                  </tr>
                </thead>
                <tbody>
                  {disciplineStats?.map((stat, index) => (
                    <tr key={stat.player.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-bold">{index + 1}</td>
                      <td className="p-2">{stat.player.name}</td>
                      <td className="p-2 text-gray-600">Team Name</td>
                      <td className="p-2 text-center text-yellow-600">{stat.yellowCards}</td>
                      <td className="p-2 text-center text-red-600">{stat.redCards}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 3. Dashboard Widgets

**Create `client/src/components/LeagueLeadersWidget.tsx`:**

```typescript
import { Card } from '@/components/ui/card';
import { Trophy, Target } from 'lucide-react';
import { useTopScorers, useTopAssisters } from '@/hooks/useServerState';

export function LeagueLeadersWidget({ competitionId }: { competitionId: number }) {
  const { data: topScorers } = useTopScorers(competitionId, 3);
  const { data: topAssisters } = useTopAssisters(competitionId, 3);

  return (
    <Card className="p-4">
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-600" />
        League Leaders
      </h3>

      <div className="space-y-4">
        {/* Top Scorers */}
        <div>
          <h4 className="text-sm font-semibold mb-2 text-gray-600">Top Scorers</h4>
          <div className="space-y-1">
            {topScorers?.slice(0, 3).map((scorer, index) => (
              <div key={scorer.player.id} className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  <span className="font-bold text-gray-400">{index + 1}.</span>
                  {scorer.player.name}
                </span>
                <span className="font-bold text-green-600">{scorer.goals}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Assisters */}
        <div>
          <h4 className="text-sm font-semibold mb-2 text-gray-600 flex items-center gap-1">
            <Target className="w-3 h-3" />
            Top Assisters
          </h4>
          <div className="space-y-1">
            {topAssisters?.slice(0, 3).map((assister, index) => (
              <div key={assister.player.id} className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  <span className="font-bold text-gray-400">{index + 1}.</span>
                  {assister.player.name}
                </span>
                <span className="font-bold text-blue-600">{assister.assists}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
```

---

## 📋 Implementation Checklist

### Phase 1: Database & Schema (Day 1)
- [ ] Update `shared/schema.ts` with new statistics interfaces
- [ ] Add `seasonStats`, `competitionStats`, `careerStats` to Player interface
- [ ] Update database schema (players table)
- [ ] Run database migration (`npm run db:push`)
- [ ] Test schema changes with existing save games

### Phase 2: Statistics Engine (Day 2-3)
- [ ] Create `server/statisticsEngine.ts`
- [ ] Implement `updatePlayerStatistics()` method
- [ ] Implement `calculatePlayerMatchStats()` method
- [ ] Implement `updateSeasonStats()` method
- [ ] Implement `updateCompetitionStats()` method
- [ ] Implement `updateCareerStats()` method
- [ ] Implement `getTopScorers()` method
- [ ] Implement `getTopAssisters()` method
- [ ] Implement `getTopCleanSheets()` method
- [ ] Implement `getDisciplineStats()` method
- [ ] Implement `getTeamForm()` method
- [ ] Write unit tests for statistics calculations

### Phase 3: Match Engine Integration (Day 3)
- [ ] Update `server/matchEngine.ts` to instantiate StatisticsEngine
- [ ] Call `updatePlayerStatistics()` after match simulation
- [ ] Test statistics update after match
- [ ] Verify clean sheet tracking for goalkeepers
- [ ] Verify assists are correctly attributed

### Phase 4: API Routes (Day 4)
- [ ] Add statistics routes to `server/routes.ts`
- [ ] `/api/statistics/top-scorers/:competitionId`
- [ ] `/api/statistics/top-assisters/:competitionId`
- [ ] `/api/statistics/clean-sheets/:competitionId`
- [ ] `/api/statistics/discipline/:competitionId`
- [ ] `/api/statistics/form/:teamId`
- [ ] `/api/statistics/player/:playerId`
- [ ] Test all endpoints with Postman/Thunder Client

### Phase 5: Frontend Hooks (Day 5)
- [ ] Add statistics hooks to `client/src/hooks/useServerState.ts`
- [ ] `useTopScorers()`
- [ ] `useTopAssisters()`
- [ ] `useTopCleanSheets()`
- [ ] `useDisciplineStats()`
- [ ] `useTeamForm()`
- [ ] `usePlayerStatistics()`
- [ ] Test hooks with React Query DevTools

### Phase 6: Statistics Page (Day 6)
- [ ] Create `client/src/pages/StatisticsPage.tsx`
- [ ] Implement tabs (Top Scorers, Assisters, Clean Sheets, Discipline)
- [ ] Add competition selector
- [ ] Style tables with proper formatting
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test with real data

### Phase 7: Dashboard Widgets (Day 7)
- [ ] Create `LeagueLeadersWidget.tsx`
- [ ] Add widget to `HomePage.tsx`
- [ ] Style widget to match dashboard theme
- [ ] Test widget updates after matches

### Phase 8: Testing & Polish (Day 8)
- [ ] Simulate full season and verify statistics accuracy
- [ ] Test statistics across multiple competitions
- [ ] Verify career stats persist across seasons
- [ ] Test edge cases (player transfers, goalkeepers, red cards)
- [ ] Performance testing (query optimization if needed)
- [ ] Add loading skeletons
- [ ] Polish UI/UX

---

## 🧪 Testing Plan

### Unit Tests
- Statistics calculation (goals, assists, clean sheets)
- Average rating calculation
- Form tracking (last 5 matches)
- Clean sheet logic (goalkeeper only, zero goals conceded)

### Integration Tests
- Match simulation → statistics update
- Multiple matches → cumulative statistics
- Player transfer → statistics persist
- Season rollover → career stats update

### Edge Cases
- Player with 0 appearances (should not appear in statistics)
- Goalkeeper clean sheet when team concedes
- Player gets assist and goal in same match
- Red card in match (should count, player still gets statistics)

---

## 📈 Success Metrics

- ✅ All player statistics accurately reflect match events
- ✅ Top scorers/assisters rankings are correct
- ✅ Clean sheets correctly attributed to goalkeepers
- ✅ Form tracking shows last 5 results accurately
- ✅ Statistics page loads in < 1 second
- ✅ Dashboard widgets update in real-time after matches
- ✅ No performance impact on match simulation

---

## 🚀 Future Enhancements

### Phase 2 (Later)
- Player of the Month awards
- Team of the Week
- Hat-trick tracker
- Milestone notifications (50th goal, 100th appearance)
- Historical records (all-time top scorer, etc.)
- Advanced stats (xG, shot accuracy %, pass completion %)
- Head-to-head statistics
- Player comparison tool

---

**Status:** Ready for implementation  
**Estimated Time:** 8 days  
**Priority:** High (Phase 2 deliverable)

---

Let's build it! 🏆⚽