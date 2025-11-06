import type { IStorage } from "./storage";
import type { Competition, Match, LeagueStanding, Team, Player, PlayerAttributes, Position } from "@shared/schema";
import { calculateOverallRating } from "@shared/schema";

export class CompetitionEngine {
  constructor(private storage: IStorage) {}

  async createLeagueCompetition(season: number, playerTeamId: number, saveGameId: number): Promise<Competition> {
    console.log(`Creating league competition for season ${season}`);
    
    const aiTeams = await this.generateAITeams(11, 0, 40, 70, saveGameId);
    const playerTeam = await this.storage.getTeam(saveGameId, playerTeamId);
    
    if (!playerTeam) {
      throw new Error("Player team not found");
    }
    
    const allTeamIds = [playerTeamId, ...aiTeams.map(t => t.id)];
    
    const fixtures = await this.generateLeagueFixtures(allTeamIds, season, saveGameId);
    
    const standings = await this.initializeStandings(allTeamIds, saveGameId);
    
    const competition = await this.storage.createCompetition(saveGameId, {
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

  private async generateAITeams(count: number, startIndex: number = 0, minReputation: number = 40, maxReputation: number = 70, saveGameId: number): Promise<Team[]> {
    const teamNames = [
      { name: "City Warriors", abbr: "CWA" },
      { name: "United Stars", abbr: "UST" },
      { name: "Athletic Club", abbr: "ATH" },
      { name: "Sporting FC", abbr: "SPO" },
      { name: "Rangers FC", abbr: "RAN" },
      { name: "Dynamo United", abbr: "DYN" },
      { name: "Olympia FC", abbr: "OLY" },
      { name: "Phoenix FC", abbr: "PHX" },
      { name: "Titans United", abbr: "TIT" },
      { name: "Lightning FC", abbr: "LIG" },
      { name: "Thunder FC", abbr: "THU" },
      { name: "Cosmos FC", abbr: "COS" },
      { name: "Victory United", abbr: "VIC" },
      { name: "Royal FC", abbr: "ROY" },
      { name: "Crown Athletic", abbr: "CRO" },
      { name: "Empire Futsal", abbr: "EMP" },
      { name: "Galaxy Stars", abbr: "GAL" },
      { name: "Stellar FC", abbr: "STE" },
      { name: "Nova United", abbr: "NOV" },
      { name: "Zenith FC", abbr: "ZEN" },
      { name: "Apex Warriors", abbr: "APX" },
      { name: "Summit FC", abbr: "SUM" },
      { name: "Peak United", abbr: "PEK" },
      { name: "Horizon FC", abbr: "HOR" },
      { name: "Eclipse United", abbr: "ECL" },
      { name: "Meteor FC", abbr: "MET" },
      { name: "Velocity United", abbr: "VEL" },
      { name: "Tempest FC", abbr: "TEM" },
      { name: "Blaze United", abbr: "BLA" },
      { name: "Inferno FC", abbr: "INF" },
      { name: "Vortex United", abbr: "VOR" },
      { name: "Cyclone FC", abbr: "CYC" },
      { name: "Storm Athletic", abbr: "STO" },
      { name: "Hurricane FC", abbr: "HUR" },
      { name: "Tornado United", abbr: "TOR" },
      { name: "Avalanche FC", abbr: "AVA" },
      { name: "Glacier United", abbr: "GLA" },
      { name: "Frost FC", abbr: "FRO" },
      { name: "Ice Warriors", abbr: "ICE" },
      { name: "Polar United", abbr: "POL" },
      { name: "Arctic FC", abbr: "ARC" },
      { name: "Volcano United", abbr: "VOL" },
      { name: "Lava FC", abbr: "LAV" },
      { name: "Magma United", abbr: "MAG" },
      { name: "Crystal FC", abbr: "CRY" },
      { name: "Diamond United", abbr: "DIA" },
      { name: "Emerald FC", abbr: "EME" },
      { name: "Sapphire United", abbr: "SAP" },
      { name: "Ruby FC", abbr: "RUB" },
      { name: "Jade United", abbr: "JAD" },
      { name: "Opal FC", abbr: "OPA" },
      { name: "Platinum United", abbr: "PLA" },
      { name: "Gold FC", abbr: "GOL" },
      { name: "Silver United", abbr: "SIL" },
      { name: "Bronze FC", abbr: "BRO" },
      { name: "Iron Warriors", abbr: "IRO" },
      { name: "Steel United", abbr: "STE" },
      { name: "Titanium FC", abbr: "TIT" },
      { name: "Cobalt United", abbr: "COB" },
      { name: "Mercury FC", abbr: "MER" },
      { name: "Neptune United", abbr: "NEP" },
      { name: "Jupiter FC", abbr: "JUP" },
      { name: "Saturn United", abbr: "SAT" },
      { name: "Mars FC", abbr: "MAR" },
      { name: "Venus United", abbr: "VEN" },
      { name: "Orion FC", abbr: "ORI" },
      { name: "Andromeda United", abbr: "AND" },
      { name: "Pegasus FC", abbr: "PEG" },
      { name: "Dragon United", abbr: "DRA" },
      { name: "Griffin FC", abbr: "GRI" },
      { name: "Eagle United", abbr: "EAG" },
      { name: "Falcon FC", abbr: "FAL" },
      { name: "Hawk United", abbr: "HAW" },
      { name: "Raven FC", abbr: "RAV" },
      { name: "Wolf United", abbr: "WOL" },
      { name: "Lion FC", abbr: "LIO" },
      { name: "Tiger United", abbr: "TIG" },
      { name: "Panther FC", abbr: "PAN" },
      { name: "Jaguar United", abbr: "JAG" },
      { name: "Cheetah FC", abbr: "CHE" },
      { name: "Leopard United", abbr: "LEO" },
      { name: "Bear FC", abbr: "BEA" },
      { name: "Shark United", abbr: "SHA" },
      { name: "Dolphin FC", abbr: "DOL" },
      { name: "Whale United", abbr: "WHA" },
      { name: "Viper FC", abbr: "VIP" },
      { name: "Cobra United", abbr: "COB" },
      { name: "Python FC", abbr: "PYT" },
      { name: "Scorpion United", abbr: "SCO" },
      { name: "Spider FC", abbr: "SPI" },
      { name: "Rhino United", abbr: "RHI" },
      { name: "Buffalo FC", abbr: "BUF" },
      { name: "Bison United", abbr: "BIS" },
      { name: "Mustang FC", abbr: "MUS" },
      { name: "Stallion United", abbr: "STA" },
      { name: "Knight FC", abbr: "KNI" },
      { name: "Warrior United", abbr: "WAR" },
      { name: "Spartan FC", abbr: "SPA" },
      { name: "Gladiator United", abbr: "GLA" },
      { name: "Champion FC", abbr: "CHA" },
    ];

    const teams: Team[] = [];

    for (let i = 0; i < Math.min(count, teamNames.length - startIndex); i++) {
      const { name, abbr } = teamNames[startIndex + i];
      
      const reputation = minReputation + Math.floor(Math.random() * (maxReputation - minReputation + 1));
      
      const budget = 300000 + Math.floor(Math.random() * 400000);
      const wageBudget = 30000 + Math.floor(Math.random() * 40000);
      const stadium = `${name} Stadium`;
      
      const team = await this.storage.createTeam(saveGameId, {
        name,
        abbreviation: abbr,
        reputation,
        budget,
        wageBudget,
        stadium,
        formation: "2-2",
        tacticalPreset: "Balanced",
        startingLineup: [],
        substitutes: [],
        isPlayerTeam: false,
      });

      const trainingLevel = Math.max(1, Math.min(5, Math.floor(reputation / 20)));
      const stadiumCapacity = 3000 + Math.floor((reputation / 100) * 7000);
      const youthLevel = Math.max(1, Math.min(5, Math.floor(reputation / 25)));

      await this.storage.createClub(saveGameId, {
        name,
        stadium,
        reputation,
        budget,
        wageBudget,
        trainingFacilityLevel: trainingLevel,
        stadiumCapacity,
        youthAcademyLevel: youthLevel,
        staff: {
          assistantCoach: reputation >= 50,
          fitnessCoach: reputation >= 60,
          scout: reputation >= 70,
        },
        boardObjectives: [
          {
            description: reputation >= 60 ? "Win the league title" : reputation >= 45 ? "Finish in top 6" : "Avoid relegation",
            target: reputation >= 60 ? "1st place" : reputation >= 45 ? "Top 6" : "Stay in division",
            importance: "high" as const,
            completed: false,
          },
          {
            description: "Maintain financial stability",
            target: "Positive balance",
            importance: "medium" as const,
            completed: false,
          },
        ],
      });

      await this.generateAISquad(team.id, reputation, saveGameId);
      
      teams.push(team);
    }

    return teams;
  }

  async createSecondDivisionLeague(season: number, saveGameId: number): Promise<Competition> {
    console.log(`Creating Second Division league for season ${season}`);
    
    const aiTeams = await this.generateAITeams(12, 12, 30, 50, saveGameId);
    const allTeamIds = aiTeams.map(t => t.id);
    
    const fixtures = await this.generateLeagueFixtures(allTeamIds, season, saveGameId);
    const standings = await this.initializeStandings(allTeamIds, saveGameId);
    
    const competition = await this.storage.createCompetition(saveGameId, {
      name: `Second Division ${season}`,
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

  async createCupCompetition(season: number, saveGameId: number): Promise<Competition> {
    console.log(`Creating National Cup for season ${season}`);
    
    const aiTeams = await this.generateAITeams(16, 24, 35, 65, saveGameId);
    const allTeamIds = aiTeams.map(t => t.id);
    
    const fixtures = await this.generateCupFixtures(allTeamIds, season, saveGameId);
    const standings: LeagueStanding[] = [];
    
    const competition = await this.storage.createCompetition(saveGameId, {
      name: `National Cup ${season}`,
      type: "cup",
      season,
      teams: allTeamIds,
      fixtures,
      standings,
      currentMatchday: 0,
      totalMatchdays: 4,
    });
    
    return competition;
  }

  private async generateCupFixtures(teamIds: number[], season: number, saveGameId: number): Promise<Match[]> {
    const fixtures: Omit<Match, "id">[] = [];
    const startDate = new Date(season, 8, 1);
    
    const rounds = Math.log2(teamIds.length);
    let currentTeams = [...teamIds];
    
    for (let round = 0; round < rounds; round++) {
      const matchDate = new Date(startDate);
      matchDate.setDate(matchDate.getDate() + (round * 14));
      
      const shuffled = currentTeams.sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < shuffled.length; i += 2) {
        fixtures.push({
          competitionId: 0,
          competitionType: "cup",
          homeTeamId: shuffled[i],
          awayTeamId: shuffled[i + 1],
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
      }
      
      currentTeams = shuffled.slice(0, shuffled.length / 2);
    }
    
    return fixtures as Match[];
  }

  async generateAISquad(teamId: number, baseRating: number, saveGameId: number): Promise<void> {
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

      await this.storage.createPlayer(saveGameId, {
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

  private async generateLeagueFixtures(teamIds: number[], season: number, saveGameId: number): Promise<Match[]> {
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

  private async initializeStandings(teamIds: number[], saveGameId: number): Promise<LeagueStanding[]> {
    const standings: LeagueStanding[] = [];
    
    for (const teamId of teamIds) {
      const team = await this.storage.getTeam(saveGameId, teamId);
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

  async updateStandings(competitionId: number, match: Match, saveGameId: number): Promise<void> {
    const competition = await this.storage.getCompetition(saveGameId, competitionId);
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

    await this.storage.updateCompetition(saveGameId, competitionId, {
      standings: competition.standings,
    });
  }

  /**
   * Update standings for multiple simulated matches in batch
   * Used for background match simulation (silent, no inbox messages)
   */
  async updateStandingsForSimulatedMatches(
    saveGameId: number,
    results: import("@shared/schema").SimulationResult[]
  ): Promise<void> {
    if (results.length === 0) return;

    // Group results by competition
    const resultsByCompetition = results.reduce((acc, result) => {
      if (!acc[result.competitionId]) {
        acc[result.competitionId] = [];
      }
      acc[result.competitionId].push(result);
      return acc;
    }, {} as Record<number, import("@shared/schema").SimulationResult[]>);

    // Update each competition
    for (const [competitionIdStr, competitionResults] of Object.entries(resultsByCompetition)) {
      const competitionId = parseInt(competitionIdStr, 10);
      await this.updateLeagueStandingsForResults(saveGameId, competitionId, competitionResults);
    }
  }

  /**
   * Update league standings for a batch of results
   */
  private async updateLeagueStandingsForResults(
    saveGameId: number,
    competitionId: number,
    results: import("@shared/schema").SimulationResult[]
  ): Promise<void> {
    const competition = await this.storage.getCompetition(saveGameId, competitionId);
    if (!competition) {
      console.error(`❌ Competition ${competitionId} not found`);
      return;
    }

    console.log(`🔍 Competition ${competitionId} standings type:`, typeof competition.standings, 
                'isArray:', Array.isArray(competition.standings));

    // Handle case where standings might be stored as an object instead of array
    let standingsArray: import("@shared/schema").LeagueStanding[];
    
    if (Array.isArray(competition.standings)) {
      standingsArray = competition.standings;
      console.log(`✓ Using array standings (${standingsArray.length} teams)`);
    } else if (competition.standings && typeof competition.standings === 'object') {
      standingsArray = Object.values(competition.standings) as import("@shared/schema").LeagueStanding[];
      console.log(`✓ Converted object to array standings (${standingsArray.length} teams)`);
    } else {
      console.error(`❌ Invalid standings format for competition ${competitionId}:`, competition.standings);
      return;
    }

    if (!standingsArray || standingsArray.length === 0) {
      console.error(`No standings found for competition ${competitionId}`);
      return;
    }

    // Process each result
    for (const result of results) {
      const homeTeam = standingsArray.find((s) => s.teamId === result.homeTeamId);
      const awayTeam = standingsArray.find((s) => s.teamId === result.awayTeamId);

      if (!homeTeam || !awayTeam) continue;

      // Update match counts
      homeTeam.played++;
      awayTeam.played++;

      // Update goals
      homeTeam.goalsFor += result.homeScore;
      homeTeam.goalsAgainst += result.awayScore;
      awayTeam.goalsFor += result.awayScore;
      awayTeam.goalsAgainst += result.homeScore;

      // Update results and points
      if (result.homeScore > result.awayScore) {
        // Home win
        homeTeam.won++;
        homeTeam.points += 3;
        awayTeam.lost++;
        homeTeam.form.push("W");
        awayTeam.form.push("L");
      } else if (result.homeScore < result.awayScore) {
        // Away win
        awayTeam.won++;
        awayTeam.points += 3;
        homeTeam.lost++;
        homeTeam.form.push("L");
        awayTeam.form.push("W");
      } else {
        // Draw
        homeTeam.drawn++;
        awayTeam.drawn++;
        homeTeam.points++;
        awayTeam.points++;
        homeTeam.form.push("D");
        awayTeam.form.push("D");
      }

      // Keep form to last 5 matches
      if (homeTeam.form.length > 5) homeTeam.form.shift();
      if (awayTeam.form.length > 5) awayTeam.form.shift();

      // Update goal difference
      homeTeam.goalDifference = homeTeam.goalsFor - homeTeam.goalsAgainst;
      awayTeam.goalDifference = awayTeam.goalsFor - awayTeam.goalsAgainst;
    }

    // Sort standings array
    standingsArray.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    // Save updated standings
    await this.storage.updateCompetition(saveGameId, competitionId, {
      standings: standingsArray,
    });

    console.log(
      `✓ Updated standings for competition ${competitionId} with ${results.length} simulated matches`
    );
  }
}
