import type { IStorage } from "./storage";
import type { Competition, Match, LeagueStanding, Team, Player, PlayerAttributes, Position } from "@shared/schema";
import { calculateOverallRating } from "@shared/schema";

export class CompetitionEngine {
  constructor(private storage: IStorage) {}

  async createLeagueCompetition(season: number, playerTeamId: number): Promise<Competition> {
    console.log(`Creating league competition for season ${season}`);
    
    const aiTeams = await this.generateAITeams(11);
    const playerTeam = await this.storage.getTeam(playerTeamId);
    
    if (!playerTeam) {
      throw new Error("Player team not found");
    }
    
    const allTeamIds = [playerTeamId, ...aiTeams.map(t => t.id)];
    
    const fixtures = await this.generateLeagueFixtures(allTeamIds, season);
    
    const standings = await this.initializeStandings(allTeamIds);
    
    const competition = await this.storage.createCompetition({
      name: `Futsal League ${season}`,
      type: "league",
      season,
      teams: allTeamIds,
      fixtures,
      standings,
      currentMatchday: 0,
      totalMatchdays: 22,
    });
    
    return competition;
  }

  private async generateAITeams(count: number): Promise<Team[]> {
    const teamNames = [
      { name: "City Warriors", abbr: "CWA" },
      { name: "United Stars", abbr: "UST" },
      { name: "Athletic Club", abbr: "ATH" },
      { name: "Sporting FC", abbr: "SPO" },
      { name: "Rangers FC", abbr: "RAN" },
      { name: "Dynamo", abbr: "DYN" },
      { name: "Olympia", abbr: "OLY" },
      { name: "Phoenix FC", abbr: "PHX" },
      { name: "Titans United", abbr: "TIT" },
      { name: "Lightning FC", abbr: "LIG" },
      { name: "Thunder FC", abbr: "THU" },
    ];

    const teams: Team[] = [];

    for (let i = 0; i < Math.min(count, teamNames.length); i++) {
      const { name, abbr } = teamNames[i];
      
      const team = await this.storage.createTeam({
        name,
        abbreviation: abbr,
        reputation: 40 + Math.floor(Math.random() * 30),
        budget: 300000 + Math.floor(Math.random() * 400000),
        wageBudget: 30000 + Math.floor(Math.random() * 40000),
        stadium: `${name} Stadium`,
        formation: "2-2",
        tacticalPreset: "Balanced",
        startingLineup: [],
        substitutes: [],
        isPlayerTeam: false,
      });

      await this.generateAISquad(team.id, 40 + Math.floor(Math.random() * 30));
      
      teams.push(team);
    }

    return teams;
  }

  private async generateAISquad(teamId: number, baseRating: number): Promise<void> {
    const firstNames = ["João", "Pedro", "Lucas", "Rafael", "Gabriel", "Miguel", "Carlos", "Andre", "Ricardo", "Fernando", "Diego", "Paulo", "Marco", "Luis", "Antonio"];
    const lastNames = ["Silva", "Santos", "Costa", "Oliveira", "Pereira", "Rodrigues", "Alves", "Fernandes", "Lima", "Gomes", "Ribeiro", "Carvalho", "Martins", "Araujo", "Sousa"];

    const positions: Position[] = ["Goalkeeper", "Goalkeeper", "Defender", "Defender", "Defender", "Defender", "Winger", "Winger", "Winger", "Winger", "Pivot", "Pivot", "Pivot"];

    for (let i = 0; i < 13; i++) {
      const position = positions[i];
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      const playerBaseRating = baseRating + Math.floor(Math.random() * 40) - 20;
      const potential = playerBaseRating + Math.floor(Math.random() * 30) + 10;
      const age = 18 + Math.floor(Math.random() * 14);

      const attributes: PlayerAttributes = {
        shooting: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        passing: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        dribbling: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        ballControl: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        firstTouch: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        pace: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        stamina: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        strength: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        agility: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        tackling: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        positioning: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        marking: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        interceptions: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        vision: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        decisionMaking: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        composure: playerBaseRating + Math.floor(Math.random() * 30) - 15,
        workRate: playerBaseRating + Math.floor(Math.random() * 30) - 15,
      };

      if (position === "Goalkeeper") {
        attributes.reflexes = playerBaseRating + Math.floor(Math.random() * 30) - 15;
        attributes.handling = playerBaseRating + Math.floor(Math.random() * 30) - 15;
        attributes.gkPositioning = playerBaseRating + Math.floor(Math.random() * 30) - 15;
        attributes.distribution = playerBaseRating + Math.floor(Math.random() * 30) - 15;
      }

      const currentAbility = calculateOverallRating(attributes, position);

      await this.storage.createPlayer({
        name: `${firstName} ${lastName}`,
        age,
        position,
        nationality: "Brazil",
        attributes,
        potential,
        currentAbility,
        form: 5 + Math.floor(Math.random() * 3),
        morale: 7 + Math.floor(Math.random() * 2),
        fitness: 90 + Math.floor(Math.random() * 10),
        condition: 85 + Math.floor(Math.random() * 15),
        injured: false,
        injuryDaysRemaining: 0,
        suspended: false,
        suspensionMatchesRemaining: 0,
        yellowCards: 0,
        redCards: 0,
        contract: {
          salary: 1500 + Math.floor(Math.random() * 2500),
          length: 2 + Math.floor(Math.random() * 3),
          releaseClause: 30000 + Math.floor(Math.random() * 120000),
        },
        value: 20000 + Math.floor(Math.random() * 80000),
        teamId,
        trainingFocus: {
          primary: "technical",
          secondary: "physical",
          intensity: "medium",
        },
      });
    }
  }

  private async generateLeagueFixtures(teamIds: number[], season: number): Promise<Match[]> {
    const fixtures: Omit<Match, "id">[] = [];
    const numTeams = teamIds.length;
    
    const startDate = new Date(season, 7, 15);
    
    let currentMatchday = 0;
    
    for (let round = 0; round < (numTeams - 1) * 2; round++) {
      const isSecondHalf = round >= numTeams - 1;
      const roundBase = isSecondHalf ? round - (numTeams - 1) : round;
      
      for (let i = 0; i < numTeams / 2; i++) {
        let home = (roundBase + i) % (numTeams - 1);
        let away = (numTeams - 1 - i + roundBase) % (numTeams - 1);

        if (i === 0) {
          away = numTeams - 1;
        }

        if (isSecondHalf) {
          [home, away] = [away, home];
        }

        const matchDate = new Date(startDate);
        matchDate.setDate(matchDate.getDate() + (round * 7));

        fixtures.push({
          competitionId: 0,
          competitionType: "league",
          homeTeamId: teamIds[home],
          awayTeamId: teamIds[away],
          homeScore: 0,
          awayScore: 0,
          date: matchDate,
          played: false,
          events: [],
          homeStats: {
            possession: 0,
            shots: 0,
            shotsOnTarget: 0,
            passes: 0,
            passAccuracy: 0,
            tackles: 0,
            fouls: 0,
            corners: 0,
            saves: 0,
          },
          awayStats: {
            possession: 0,
            shots: 0,
            shotsOnTarget: 0,
            passes: 0,
            passAccuracy: 0,
            tackles: 0,
            fouls: 0,
            corners: 0,
            saves: 0,
          },
          playerRatings: {},
        });

        currentMatchday++;
      }
    }

    return fixtures as Match[];
  }

  private async initializeStandings(teamIds: number[]): Promise<LeagueStanding[]> {
    const standings: LeagueStanding[] = [];
    
    for (const teamId of teamIds) {
      const team = await this.storage.getTeam(teamId);
      standings.push({
        teamId,
        teamName: team?.name || `Team ${teamId}`,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        form: [],
      });
    }
    
    return standings;
  }

  async updateStandings(competitionId: number, match: Match): Promise<void> {
    const competition = await this.storage.getCompetition(competitionId);
    if (!competition) return;

    const homeTeam = competition.standings.find(s => s.teamId === match.homeTeamId);
    const awayTeam = competition.standings.find(s => s.teamId === match.awayTeamId);

    if (!homeTeam || !awayTeam) return;

    homeTeam.played++;
    awayTeam.played++;
    homeTeam.goalsFor += match.homeScore;
    homeTeam.goalsAgainst += match.awayScore;
    awayTeam.goalsFor += match.awayScore;
    awayTeam.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      homeTeam.won++;
      homeTeam.points += 3;
      awayTeam.lost++;
      homeTeam.form.push("W");
      awayTeam.form.push("L");
    } else if (match.homeScore < match.awayScore) {
      awayTeam.won++;
      awayTeam.points += 3;
      homeTeam.lost++;
      homeTeam.form.push("L");
      awayTeam.form.push("W");
    } else {
      homeTeam.drawn++;
      awayTeam.drawn++;
      homeTeam.points++;
      awayTeam.points++;
      homeTeam.form.push("D");
      awayTeam.form.push("D");
    }

    if (homeTeam.form.length > 5) homeTeam.form.shift();
    if (awayTeam.form.length > 5) awayTeam.form.shift();

    homeTeam.goalDifference = homeTeam.goalsFor - homeTeam.goalsAgainst;
    awayTeam.goalDifference = awayTeam.goalsFor - awayTeam.goalsAgainst;

    competition.standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    await this.storage.updateCompetition(competitionId, {
      standings: competition.standings,
    });
  }
}
