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
    const homePlayers = await this.storage.getPlayersByTeam(saveGameId, userId, match.homeTeamId);
    const awayPlayers = await this.storage.getPlayersByTeam(saveGameId, userId, match.awayTeamId);

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
      await this.updateCareerStats(saveGameId, userId, player, stats, match);
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
    const gameState = await this.storage.getGameState(saveGameId, userId);
    const currentSeason = gameState.season;

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
    const gameState = await this.storage.getGameState(saveGameId, userId);
    const currentSeason = gameState.season;
    const competition = await this.storage.getCompetition(saveGameId, userId, match.competitionId);

    // Find or create competition stats entry
    let compStats = player.competitionStats.find(
      cs => cs.competitionId === match.competitionId && cs.season === currentSeason
    );

    if (!compStats) {
      compStats = {
        competitionId: match.competitionId,
        competitionName: competition?.name || 'Unknown Competition',
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
    matchStats: any,
    match: Match
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
    if (player.position === 'Goalkeeper') {
      const teamConceded = player.teamId === match.homeTeamId 
        ? match.awayScore 
        : match.homeScore;
      if (teamConceded === 0) {
        player.careerStats.totalCleanSheets++;
      }
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
    const gameState = await this.storage.getGameState(saveGameId, userId);
    const currentSeason = gameState.season;
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
    const gameState = await this.storage.getGameState(saveGameId, userId);
    const currentSeason = gameState.season;
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
    const gameState = await this.storage.getGameState(saveGameId, userId);
    const currentSeason = gameState.season;
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
    const matches = await this.storage.getAllMatches(saveGameId, userId);

    // Filter matches for this team
    let teamMatches = matches.filter(
      (m: Match) => m.played && (m.homeTeamId === teamId || m.awayTeamId === teamId)
    );

    // Filter by competition if specified
    if (competitionId) {
      teamMatches = teamMatches.filter((m: Match) => m.competitionId === competitionId);
    }

    // Sort by date (most recent first)
    teamMatches.sort((a: Match, b: Match) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
    const gameState = await this.storage.getGameState(saveGameId, userId);
    const currentSeason = gameState.season;
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
  private async getAllPlayersInSaveGame(saveGameId: number, userId: number): Promise<Player[]> {
    return await this.storage.getAllPlayers(saveGameId, userId);
  }
}
