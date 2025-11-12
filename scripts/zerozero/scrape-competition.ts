/**
 * ZeroZero.pt Competition Scraper
 * Versatile scraper that extracts teams from competition pages and scrapes all players
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Player {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  nationality: string;
  position: string;
  squadNumber: number | null;
  attributes: {
    technical: number;
    tactical: number;
    physical: number;
    mental: number;
  };
  preferredFoot: 'Left' | 'Right' | 'Both';
  height: number | null;
  weight: number | null;
}

interface Team {
  name: string;
  abbreviation: string;
  city: string;
  country: string;
  founded: number | null;
  stadium: string | null;
  stadiumCapacity: number | null;
  colors: {
    primary: string;
    secondary: string;
  };
  reputation: number;
  budget: number;
  players: Player[];
}

interface Competition {
  name: string;
  country: string;
  type: 'league' | 'cup' | 'playoff';
  season: number;
  divisionLevel: number;
  teams: string[];
  promotionSpots: number;
  relegationSpots: number;
  prizeMoney: {
    winner: number;
    runnerUp: number;
    perWin: number;
  };
}

interface ScrapedData {
  season: number;
  scrapedAt: string;
  competitions: Competition[];
  teams: Team[];
}

interface TeamInfo {
  name: string;
  url: string;
}

// Configuration
const COMPETITION_URLS = [
  'https://www.zerozero.pt/edicao/ii-divisao-futsal-serie-a-2025-26/204304',
  'https://www.zerozero.pt/edicao/ii-divisao-futsal-serie-b-2025-26/204305',
];

const SEASON_ID = '155'; // 2024/2025 season
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds to be respectful
const DELAY_BETWEEN_TEAMS = 1500; // 1.5 seconds between team scrapes

/**
 * Fetch HTML content from a URL
 */
async function fetchHTML(url: string): Promise<string> {
  try {
    console.log(`  Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,pt;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Handle Portuguese encoding
    const buffer = await response.arrayBuffer();
    
    // Try UTF-8 first
    let text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    
    // If UTF-8 produces replacement characters, try ISO-8859-1
    if (text.includes('�')) {
      text = new TextDecoder('iso-8859-1').decode(buffer);
    }
    
    return text;
  } catch (error) {
    // Fallback to ISO-8859-1
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,pt;q=0.8',
      },
    });
    
    const buffer = await response.arrayBuffer();
    return new TextDecoder('iso-8859-1').decode(buffer);
  }
}

/**
 * Extract competition name from HTML
 */
function extractCompetitionName(html: string): string {
  // Try to find the competition name in the page title or h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  if (h1Match) {
    return h1Match[1].trim();
  }

  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) {
    // Extract just the competition name, remove "zerozero.pt" and other cruft
    const title = titleMatch[1].trim();
    return title.split('|')[0].trim().split('-')[0].trim();
  }

  return 'Unknown Competition';
}

/**
 * Extract teams from competition standings table
 */
function extractTeamsFromStandings(html: string): TeamInfo[] {
  const teams: TeamInfo[] = [];

  // Find the standings table
  const tableMatch = html.match(/<table[^>]*class="[^"]*zztable[^"]*stats[^"]*"[^>]*>([\s\S]*?)<\/table>/);
  if (!tableMatch) {
    console.log('  Could not find standings table');
    return teams;
  }

  const tableHtml = tableMatch[1];

  // Extract team links from table rows
  // Pattern: <a href="/equipa/{team-slug}/{team-id}?epoca_id={season}">
  const teamPattern = /<a href="(\/equipa\/[^"]+\/(\d+)\?epoca_id=\d+)"[^>]*>([^<]+)<\/a>/g;
  let match;
  const seenTeamIds = new Set<string>();

  while ((match = teamPattern.exec(tableHtml)) !== null) {
    const partialUrl = match[1];
    const teamId = match[2];
    const teamName = match[3].trim();

    // Avoid duplicates (teams appear multiple times in the table)
    if (seenTeamIds.has(teamId)) {
      continue;
    }
    seenTeamIds.add(teamId);

    // Build full URL with current season
    const fullUrl = `https://www.zerozero.pt${partialUrl}`;

    teams.push({
      name: teamName,
      url: fullUrl,
    });
  }

  return teams;
}

/**
 * Parse player data from HTML using the team_squad div structure
 */
function parsePlayerData(html: string, teamName: string): Player[] {
  const players: Player[] = [];

  // Find the team_squad section
  const squadMatch = html.match(/<div id="team_squad"[^>]*>([\s\S]*?)(<div id=|$)/);
  if (!squadMatch) {
    console.log(`    Could not find team_squad section for ${teamName}`);
    return players;
  }

  const squadHtml = squadMatch[1];

  // Track position titles and their indices
  const positionTitles: Array<{title: string, index: number}> = [];
  const titlePattern = /<div class="title">([^<]+)<\/div>/g;
  let titleMatch;
  while ((titleMatch = titlePattern.exec(squadHtml)) !== null) {
    positionTitles.push({ title: titleMatch[1], index: titleMatch.index });
  }

  // Find all staff entries
  const staffStartPattern = /<div class="staff">/g;
  const staffStarts: number[] = [];
  let startMatch;
  
  while ((startMatch = staffStartPattern.exec(squadHtml)) !== null) {
    staffStarts.push(startMatch.index);
  }

  // Extract each player
  for (let i = 0; i < staffStarts.length; i++) {
    const start = staffStarts[i];
    const end = i < staffStarts.length - 1 ? staffStarts[i + 1] : squadHtml.length;
    const staffContent = squadHtml.substring(start, end);

    try {
      // Extract player number (optional)
      const numberMatch = staffContent.match(/<div class="number">([^<]+)<\/div>/);
      const numberStr = numberMatch ? numberMatch[1].trim() : null;
      const squadNumber = numberStr && numberStr !== '-' && !isNaN(parseInt(numberStr)) ? parseInt(numberStr) : null;

      // Extract player name (required)
      const nameMatch = staffContent.match(/<a href="\/jogador\/[^"]*">([^<]+)<\/a>/);
      const fullName = nameMatch ? nameMatch[1].trim() : null;

      if (!fullName) continue; // Skip if no name found

      // Split name into first and last name
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Extract nationality from flag (optional)
      const nationalityMatch = staffContent.match(/<span class="flag:([A-Z]{2})"/);
      const nationalityCode = nationalityMatch ? nationalityMatch[1] : 'PT';
      const nationality = getNationalityFromCode(nationalityCode);

      // Extract age (optional)
      const ageMatch = staffContent.match(/<span>(\d+)\s*anos<\/span>/);
      const age = ageMatch ? parseInt(ageMatch[1]) : null;
      
      // Calculate approximate birth year
      const currentYear = new Date().getFullYear();
      const birthYear = age ? currentYear - age : null;
      const dateOfBirth = birthYear ? `${birthYear}-01-01` : null;

      // Find which position this player belongs to
      let position = 'Unknown';
      const staffIndex = start;
      for (let j = positionTitles.length - 1; j >= 0; j--) {
        if (positionTitles[j].index < staffIndex) {
          position = positionTitles[j].title;
          break;
        }
      }

      // Generate realistic attributes based on division level (II Divisão is level 2)
      const divisionLevel = 2;
      const attributes = generateAttributes(divisionLevel, position);

      players.push({
        firstName,
        lastName,
        dateOfBirth,
        nationality,
        position: normalizePosition(position),
        squadNumber,
        attributes,
        preferredFoot: Math.random() > 0.25 ? 'Right' : 'Left', // 75% right-footed
        height: generateHeight(),
        weight: generateWeight(),
      });
    } catch (error) {
      console.error(`    Error parsing player from staff div:`, error);
    }
  }

  return players;
}

/**
 * Convert country code to nationality name
 */
function getNationalityFromCode(code: string): string {
  const nationalityMap: Record<string, string> = {
    'PT': 'Portugal',
    'BR': 'Brazil',
    'ES': 'Spain',
    'AR': 'Argentina',
    'IT': 'Italy',
    'FR': 'France',
    'KZ': 'Kazakhstan',
    'RU': 'Russia',
    'UA': 'Ukraine',
    'CV': 'Cape Verde',
    'AO': 'Angola',
    'MZ': 'Mozambique',
    'GW': 'Guinea-Bissau',
    'ST': 'São Tomé and Príncipe',
    'VE': 'Venezuela',
    'CO': 'Colombia',
    'UY': 'Uruguay',
  };

  return nationalityMap[code] || 'Unknown';
}

/**
 * Normalize position names to standard format
 */
function normalizePosition(position: string): string {
  const normalized = position.toLowerCase();
  
  if (normalized.includes('guarda') || normalized.includes('redes') || normalized.includes('gr')) {
    return 'Goalkeeper';
  }
  if (normalized.includes('fixo') && normalized.includes('ala')) {
    return 'Fixo/Winger';
  }
  if (normalized.includes('fixo') || normalized.includes('fix')) {
    return 'Fixo';
  }
  if (normalized.includes('ala')) {
    return 'Winger';
  }
  if (normalized.includes('pivot') || normalized.includes('piv')) {
    return 'Pivot';
  }
  if (normalized.includes('universal')) {
    return 'Universal';
  }
  
  return position;
}

/**
 * Generate realistic attributes based on division level and position
 */
function generateAttributes(divisionLevel: number, position: string): {
  technical: number;
  tactical: number;
  physical: number;
  mental: number;
} {
  // Base attributes for II Divisão (level 2): 80-140 range
  const baseMin = 80;
  const baseMax = 140;
  
  // Slight variation by position
  const positionModifiers: Record<string, { technical: number; tactical: number; physical: number; mental: number }> = {
    'Goalkeeper': { technical: -1, tactical: 0, physical: 0, mental: 1 },
    'Fixo': { technical: 0, tactical: 1, physical: 1, mental: 0 },
    'Winger': { technical: 1, tactical: 0, physical: 1, mental: -1 },
    'Pivot': { technical: 1, tactical: 1, physical: 0, mental: 0 },
    'Universal': { technical: 0, tactical: 0, physical: 0, mental: 0 },
  };
  
  const normalized = normalizePosition(position);
  const modifiers = positionModifiers[normalized] || { technical: 0, tactical: 0, physical: 0, mental: 0 };
  
  return {
    technical: Math.max(1, Math.min(20, baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1)) + modifiers.technical)),
    tactical: Math.max(1, Math.min(20, baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1)) + modifiers.tactical)),
    physical: Math.max(1, Math.min(20, baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1)) + modifiers.physical)),
    mental: Math.max(1, Math.min(20, baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1)) + modifiers.mental)),
  };
}

/**
 * Generate realistic height (in cm)
 */
function generateHeight(): number {
  // Futsal players typically 165-185cm
  return Math.floor(Math.random() * 20) + 165;
}

/**
 * Generate realistic weight (in kg)
 */
function generateWeight(): number {
  // Futsal players typically 65-85kg
  return Math.floor(Math.random() * 20) + 65;
}

/**
 * Extract team abbreviation from name
 */
function generateAbbreviation(teamName: string): string {
  // Handle common patterns
  if (teamName.includes('FC ')) return teamName.replace('FC ', '').substring(0, 3).toUpperCase();
  if (teamName.includes('SC ')) return teamName.replace('SC ', '').substring(0, 3).toUpperCase();
  if (teamName.includes('AD ')) return teamName.replace('AD ', '').substring(0, 3).toUpperCase();
  if (teamName.includes('CS ')) return teamName.replace('CS ', '').substring(0, 3).toUpperCase();
  
  // Use first letters of words
  const words = teamName.split(' ').filter(w => w.length > 2);
  if (words.length >= 2) {
    return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  }
  
  // Fallback to first 3 characters
  return teamName.substring(0, 3).toUpperCase();
}

/**
 * Determine reputation based on division level
 */
function generateReputation(divisionLevel: number): number {
  // II Divisão teams: 40-60 range
  const baseReputation = divisionLevel === 2 ? 40 : 70;
  return baseReputation + Math.floor(Math.random() * 20);
}

/**
 * Generate budget based on division level
 */
function generateBudget(divisionLevel: number): number {
  // II Divisão teams: 50k-200k range
  const baseBudget = divisionLevel === 2 ? 50000 : 500000;
  const variance = divisionLevel === 2 ? 150000 : 1500000;
  return baseBudget + Math.floor(Math.random() * variance);
}

/**
 * Delay function for respectful scraping
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract team colors from gradient styling
 */
function extractTeamColors(html: string): { primary: string; secondary: string } {
  // Look for the gradient in the top div: background: linear-gradient(to bottom right, #COLOR1,50%, #COLOR2)
  const gradientMatch = html.match(/background:\s*linear-gradient\([^)]*,\s*(#[0-9A-Fa-f]{6})\s*,\s*\d+%\s*,\s*(#[0-9A-Fa-f]{6})\)/);
  
  if (gradientMatch) {
    return {
      primary: gradientMatch[1].toUpperCase(),
      secondary: gradientMatch[2].toUpperCase(),
    };
  }

  // Fallback to default colors if gradient not found
  return { primary: '#000000', secondary: '#FFFFFF' };
}

/**
 * Scrape a single team's players and create Team object
 */
async function scrapeTeam(teamInfo: TeamInfo, teamIndex: number, totalTeams: number, divisionLevel: number): Promise<Team> {
  try {
    console.log(`    [${teamIndex + 1}/${totalTeams}] Scraping ${teamInfo.name}...`);
    
    const html = await fetchHTML(teamInfo.url);
    const players = parsePlayerData(html, teamInfo.name);
    const colors = extractTeamColors(html);
    
    console.log(`    ✓ Found ${players.length} players for ${teamInfo.name} (Colors: ${colors.primary}/${colors.secondary})`);

    return {
      name: teamInfo.name,
      abbreviation: generateAbbreviation(teamInfo.name),
      city: teamInfo.name, // Placeholder, could extract from team page
      country: 'Portugal',
      founded: null, // Could be scraped from team page
      stadium: null, // Could be scraped from team page
      stadiumCapacity: null, // Could be scraped from team page
      colors,
      reputation: generateReputation(divisionLevel),
      budget: generateBudget(divisionLevel),
      players,
    };
  } catch (error) {
    console.error(`    ✗ Failed to scrape ${teamInfo.name}:`, error);
    return {
      name: teamInfo.name,
      abbreviation: generateAbbreviation(teamInfo.name),
      city: teamInfo.name,
      country: 'Portugal',
      founded: null,
      stadium: null,
      stadiumCapacity: null,
      colors: { primary: '#000000', secondary: '#FFFFFF' },
      reputation: generateReputation(divisionLevel),
      budget: generateBudget(divisionLevel),
      players: [],
    };
  }
}

/**
 * Scrape a single competition
 */
async function scrapeCompetition(
  competitionUrl: string, 
  competitionIndex: number,
  allTeams: Team[]
): Promise<{ competition: Competition; teams: Team[] }> {
  console.log(`\n[${'='.repeat(60)}]`);
  console.log(`Competition ${competitionIndex + 1}: ${competitionUrl}`);
  console.log(`[${'='.repeat(60)}]\n`);

  try {
    // Fetch competition page
    console.log(`  Fetching competition standings...`);
    const html = await fetchHTML(competitionUrl);
    
    // Extract competition name
    const competitionName = extractCompetitionName(html);
    console.log(`  Competition: ${competitionName}`);

    // Determine division level from name
    let divisionLevel = 1;
    if (competitionName.toLowerCase().includes('ii divisão') || competitionName.toLowerCase().includes('segunda')) {
      divisionLevel = 2;
    } else if (competitionName.toLowerCase().includes('iii divisão')) {
      divisionLevel = 3;
    }

    // Extract teams from standings
    const teamInfos = extractTeamsFromStandings(html);
    console.log(`  ✓ Found ${teamInfos.length} teams in standings\n`);

    if (teamInfos.length === 0) {
      console.log(`  ⚠ No teams found in competition`);
      return {
        competition: {
          name: competitionName,
          country: 'Portugal',
          type: 'league',
          season: 2025,
          divisionLevel,
          teams: [],
          promotionSpots: divisionLevel >= 2 ? 2 : 0,
          relegationSpots: divisionLevel <= 2 ? 2 : 0,
          prizeMoney: {
            winner: divisionLevel === 1 ? 100000 : divisionLevel === 2 ? 25000 : 10000,
            runnerUp: divisionLevel === 1 ? 50000 : divisionLevel === 2 ? 12000 : 5000,
            perWin: divisionLevel === 1 ? 1000 : divisionLevel === 2 ? 500 : 250,
          },
        },
        teams: [],
      };
    }

    // Scrape each team
    console.log(`  Scraping team players...`);
    const scrapedTeams: Team[] = [];

    for (let i = 0; i < teamInfos.length; i++) {
      const teamData = await scrapeTeam(teamInfos[i], i, teamInfos.length, divisionLevel);
      scrapedTeams.push(teamData);

      // Wait before next team (except for last team)
      if (i < teamInfos.length - 1) {
        await delay(DELAY_BETWEEN_TEAMS);
      }
    }

    const totalPlayers = scrapedTeams.reduce((sum, team) => sum + team.players.length, 0);
    console.log(`\n  ✓ Competition complete: ${scrapedTeams.length} teams, ${totalPlayers} players`);

    // Create competition object
    const competition: Competition = {
      name: competitionName,
      country: 'Portugal',
      type: 'league',
      season: 2025,
      divisionLevel,
      teams: scrapedTeams.map(t => t.name),
      promotionSpots: divisionLevel >= 2 ? 2 : 0,
      relegationSpots: divisionLevel <= 2 ? 2 : 0,
      prizeMoney: {
        winner: divisionLevel === 1 ? 100000 : divisionLevel === 2 ? 25000 : 10000,
        runnerUp: divisionLevel === 1 ? 50000 : divisionLevel === 2 ? 12000 : 5000,
        perWin: divisionLevel === 1 ? 1000 : divisionLevel === 2 ? 500 : 250,
      },
    };

    return {
      competition,
      teams: scrapedTeams,
    };
  } catch (error) {
    console.error(`  ✗ Failed to scrape competition:`, error);
    return {
      competition: {
        name: 'Unknown',
        country: 'Portugal',
        type: 'league',
        season: 2025,
        divisionLevel: 2,
        teams: [],
        promotionSpots: 0,
        relegationSpots: 0,
        prizeMoney: {
          winner: 0,
          runnerUp: 0,
          perWin: 0,
        },
      },
      teams: [],
    };
  }
}

/**
 * Scrape all competitions
 */
async function scrapeAllCompetitions(): Promise<ScrapedData> {
  console.log(`Starting to scrape ${COMPETITION_URLS.length} competitions...\n`);

  const competitions: Competition[] = [];
  const allTeams: Team[] = [];

  for (let i = 0; i < COMPETITION_URLS.length; i++) {
    const { competition, teams } = await scrapeCompetition(COMPETITION_URLS[i], i, allTeams);
    competitions.push(competition);
    allTeams.push(...teams);

    // Wait before next competition (except for last one)
    if (i < COMPETITION_URLS.length - 1) {
      console.log(`\n  Waiting ${DELAY_BETWEEN_REQUESTS}ms before next competition...\n`);
      await delay(DELAY_BETWEEN_REQUESTS);
    }
  }

  return {
    season: 2025,
    scrapedAt: new Date().toISOString(),
    competitions,
    teams: allTeams,
  };
}

/**
 * Save data to JSON file
 */
function saveToJSON(data: ScrapedData, filename: string): void {
  const outputDir = path.join(__dirname, '../../data/zerozero');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  
  console.log(`\n✓ Data saved to: ${outputPath}`);
}

/**
 * Generate summary statistics
 */
function generateSummary(data: ScrapedData): void {
  const totalTeams = data.teams.length;
  const totalPlayers = data.teams.reduce((sum, team) => sum + team.players.length, 0);
  
  console.log('\n' + '='.repeat(70));
  console.log('SCRAPING SUMMARY');
  console.log('='.repeat(70));
  console.log(`Season: ${data.season}/${data.season + 1}`);
  console.log(`Competitions scraped: ${data.competitions.length}`);
  console.log(`Total teams: ${totalTeams}`);
  console.log(`Total players: ${totalPlayers}`);
  console.log(`Average players per team: ${totalTeams > 0 ? (totalPlayers / totalTeams).toFixed(1) : 0}`);
  console.log('='.repeat(70) + '\n');

  // Per-competition breakdown
  data.competitions.forEach((comp, idx) => {
    const compTeams = data.teams.filter(team => comp.teams.includes(team.name));
    const compPlayers = compTeams.reduce((sum, team) => sum + team.players.length, 0);
    
    console.log(`Competition ${idx + 1}: ${comp.name}`);
    console.log(`  Division Level: ${comp.divisionLevel}`);
    console.log(`  Teams: ${comp.teams.length}`);
    console.log(`  Players: ${compPlayers}`);
    console.log(`  Promotion Spots: ${comp.promotionSpots}`);
    console.log(`  Relegation Spots: ${comp.relegationSpots}`);
    console.log(`  Prize Money (Winner): €${comp.prizeMoney.winner.toLocaleString()}`);
    console.log(`  Teams:`);
    compTeams.forEach(team => {
      console.log(`    - ${team.name.padEnd(30)} ${team.players.length} players (Rep: ${team.reputation}, Budget: €${team.budget.toLocaleString()})`);
    });
    console.log();
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(68) + '║');
  console.log('║' + '  ZeroZero.pt Competition Scraper'.padEnd(68) + '║');
  console.log('║' + '  Versatile scraper for Portuguese futsal competitions'.padEnd(68) + '║');
  console.log('║' + ' '.repeat(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝\n');

  try {
    const data = await scrapeAllCompetitions();
    
    // Save to JSON
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `segunda-liga-${timestamp}.json`;
    saveToJSON(data, filename);
    
    // Generate summary
    generateSummary(data);

    console.log('✓ Scraping completed successfully!');
    console.log('\nYou can now use this JSON file for modding your game.');
  } catch (error) {
    console.error('✗ Scraping failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
