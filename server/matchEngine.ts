import type { IStorage } from "./storage";
import type { Match, MatchEvent, MatchStats, Player, Team } from "@shared/schema";

export class MatchEngine {
  constructor(private storage: IStorage) {}

  async simulateMatch(saveGameId: number, userId: number, matchId: number): Promise<Match> {
    const match = await this.storage.getMatch(saveGameId, userId, matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (match.played) {
      return match;
    }

    const homeTeam = await this.storage.getTeam(saveGameId, userId, match.homeTeamId);
    const awayTeam = await this.storage.getTeam(saveGameId, userId, match.awayTeamId);

    if (!homeTeam || !awayTeam) {
      throw new Error("Teams not found");
    }

    const homePlayers = await this.storage.getPlayersByTeam(saveGameId, userId, match.homeTeamId);
    const awayPlayers = await this.storage.getPlayersByTeam(saveGameId, userId, match.awayTeamId);

    const homeRating = this.calculateTeamRating(homePlayers);
    const awayRating = this.calculateTeamRating(awayPlayers);

    const homeStrength = homeRating * 1.1;
    const awayStrength = awayRating;

    const events: MatchEvent[] = [];
    const playerRatings: Record<number, number> = {};

    const { homeScore, awayScore, matchEvents } = this.simulateMatchAction(
      homeStrength,
      awayStrength,
      homePlayers,
      awayPlayers,
      homeTeam,
      awayTeam
    );

    events.push(...matchEvents);

    homePlayers.forEach(p => {
      playerRatings[p.id] = 6 + Math.random() * 3;
    });
    awayPlayers.forEach(p => {
      playerRatings[p.id] = 6 + Math.random() * 3;
    });

    const homeStats = this.generateMatchStats(homeStrength, awayStrength, homeScore);
    const awayStats = this.generateMatchStats(awayStrength, homeStrength, awayScore);

    const updatedMatch = await this.storage.updateMatch(saveGameId, userId, matchId, {
      homeScore,
      awayScore,
      played: true,
      events,
      homeStats,
      awayStats,
      playerRatings,
    });

    return updatedMatch!;
  }

  private simulateMatchAction(
    homeStrength: number,
    awayStrength: number,
    homePlayers: Player[],
    awayPlayers: Player[],
    homeTeam: Team,
    awayTeam: Team
  ): { homeScore: number; awayScore: number; matchEvents: MatchEvent[] } {
    let homeScore = 0;
    let awayScore = 0;
    const events: MatchEvent[] = [];

    const totalStrength = homeStrength + awayStrength;
    const homeChance = homeStrength / totalStrength;

    const numGoals = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 4);

    for (let i = 0; i < numGoals; i++) {
      const minute = Math.floor(Math.random() * 40);
      const isHomeGoal = Math.random() < homeChance;

      if (isHomeGoal) {
        homeScore++;
        const scorer = this.getRandomOutfieldPlayer(homePlayers);
        const hasAssist = Math.random() > 0.4;
        const assister = hasAssist ? this.getRandomOutfieldPlayer(homePlayers) : null;

        events.push({
          minute,
          type: "goal",
          playerId: scorer.id,
          playerName: scorer.name,
          teamId: homeTeam.id,
          assistId: assister?.id,
          assistName: assister?.name,
          description: `GOAL! ${scorer.name} scores for ${homeTeam.name}${assister ? ` (assisted by ${assister.name})` : ""}!`,
        });
      } else {
        awayScore++;
        const scorer = this.getRandomOutfieldPlayer(awayPlayers);
        const hasAssist = Math.random() > 0.4;
        const assister = hasAssist ? this.getRandomOutfieldPlayer(awayPlayers) : null;

        events.push({
          minute,
          type: "goal",
          playerId: scorer.id,
          playerName: scorer.name,
          teamId: awayTeam.id,
          assistId: assister?.id,
          assistName: assister?.name,
          description: `GOAL! ${scorer.name} scores for ${awayTeam.name}${assister ? ` (assisted by ${assister.name})` : ""}!`,
        });
      }
    }

    const numCards = Math.floor(Math.random() * 3);
    for (let i = 0; i < numCards; i++) {
      const minute = Math.floor(Math.random() * 40);
      const isHome = Math.random() < 0.5;
      const players = isHome ? homePlayers : awayPlayers;
      const team = isHome ? homeTeam : awayTeam;
      const player = this.getRandomOutfieldPlayer(players);
      const isYellow = Math.random() > 0.2;

      events.push({
        minute,
        type: isYellow ? "yellow_card" : "red_card",
        playerId: player.id,
        playerName: player.name,
        teamId: team.id,
        description: `${isYellow ? "Yellow" : "Red"} card for ${player.name}!`,
      });
    }

    events.sort((a, b) => a.minute - b.minute);

    return { homeScore, awayScore, matchEvents: events };
  }

  private calculateTeamRating(players: Player[]): number {
    if (players.length === 0) return 100;

    const avgRating = players.reduce((sum, p) => sum + p.currentAbility, 0) / players.length;
    const avgForm = players.reduce((sum, p) => sum + p.form, 0) / players.length;
    const avgMorale = players.reduce((sum, p) => sum + p.morale, 0) / players.length;

    return avgRating * (1 + (avgForm / 10) * 0.1 + (avgMorale / 10) * 0.05);
  }

  private getRandomOutfieldPlayer(players: Player[]): Player {
    const outfield = players.filter(p => p.position !== "Goalkeeper");
    return outfield[Math.floor(Math.random() * outfield.length)];
  }

  private generateMatchStats(
    teamStrength: number,
    opponentStrength: number,
    goals: number
  ): MatchStats {
    const totalStrength = teamStrength + opponentStrength;
    const possession = Math.round((teamStrength / totalStrength) * 100);

    return {
      possession,
      shots: goals * 2 + Math.floor(Math.random() * 8),
      shotsOnTarget: goals + Math.floor(Math.random() * 4),
      passes: possession * 3 + Math.floor(Math.random() * 50),
      passAccuracy: 70 + Math.floor(Math.random() * 20),
      tackles: Math.floor(Math.random() * 15) + 5,
      fouls: Math.floor(Math.random() * 10),
      corners: Math.floor(Math.random() * 8),
      saves: Math.floor(Math.random() * 5),
    };
  }
}
