/**
 * ZeroZero.pt Player Scraper
 * Scrapes player data from Portuguese futsal teams for modding purposes
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Player {
  name: string;
  position: string;
  age: number | null;
  number: number | null;
  nationality: string | null;
}

interface TeamData {
  teamName: string;
  teamUrl: string;
  players: Player[];
}

interface ScrapedData {
  season: string;
  competition: string;
  scrapedAt: string;
  teams: TeamData[];
}

// Team URLs to scrape
const TEAM_URLS = [
  { name: 'Benfica', url: 'https://www.zerozero.pt/equipa/benfica/4368?epoca_id=155' },
  { name: 'Sporting', url: 'https://www.zerozero.pt/equipa/sporting/4369?epoca_id=155' },
  { name: 'Leões Porto Salvo', url: 'https://www.zerozero.pt/equipa/leoes-porto-salvo/14914?epoca_id=155' },
  { name: 'Ferreira do Zêzere', url: 'https://www.zerozero.pt/equipa/ferreira-do-zezere/92774?epoca_id=155' },
  { name: 'SC Braga', url: 'https://www.zerozero.pt/equipa/sc-braga/6555?epoca_id=155' },
  { name: 'FC Famalicão', url: 'https://www.zerozero.pt/equipa/fc-famalicao/264123?epoca_id=155' },
  { name: 'Rio Ave', url: 'https://www.zerozero.pt/equipa/rio-ave/6557?epoca_id=155' },
  { name: 'Torreense', url: 'https://www.zerozero.pt/equipa/torreense/231427?epoca_id=155' },
  { name: 'ADCR Caxinas', url: 'https://www.zerozero.pt/equipa/adcr-caxinas-poca-barca/32291?epoca_id=155' },
  { name: 'Quinta dos Lombos', url: 'https://www.zerozero.pt/equipa/quinta-dos-lombos/16391?epoca_id=155' },
  { name: 'Eléctrico', url: 'https://www.zerozero.pt/equipa/electrico/14910?epoca_id=155' },
  { name: 'AD Fundão', url: 'https://www.zerozero.pt/equipa/ad-fundao/7891?epoca_id=155' },
];

const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds to be respectful

/**
 * Fetch HTML content from a URL
 */
async function fetchHTML(url: string): Promise<string> {
  try {
    console.log(`Fetching: ${url}`);
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

    // Try ISO-8859-1 encoding (Latin-1) which is commonly used for Portuguese websites
    const buffer = await response.arrayBuffer();
    
    // Try UTF-8 first
    let text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    
    // If UTF-8 fails or produces replacement characters, try ISO-8859-1
    if (text.includes('�')) {
      text = new TextDecoder('iso-8859-1').decode(buffer);
    }
    
    return text;
  } catch (error) {
    // If UTF-8 decoding failed, try ISO-8859-1
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
 * Parse player data from HTML using the team_squad div structure
 */
function parsePlayerData(html: string, teamName: string): Player[] {
  const players: Player[] = [];

  // Find the team_squad section
  const squadMatch = html.match(/<div id="team_squad"[^>]*>([\s\S]*?)(<div id=|$)/);
  if (!squadMatch) {
    console.log(`Could not find team_squad section for ${teamName}`);
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

  // Find all staff entries using a more lenient pattern
  // Match from <div class="staff"> to the next <div class="staff"> or end of section
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
      const number = numberStr && numberStr !== '-' && !isNaN(parseInt(numberStr)) ? parseInt(numberStr) : null;

      // Extract player name (required)
      const nameMatch = staffContent.match(/<a href="\/jogador\/[^"]*">([^<]+)<\/a>/);
      const name = nameMatch ? nameMatch[1].trim() : null;

      if (!name) continue; // Skip if no name found

      // Extract nationality from flag (optional)
      const nationalityMatch = staffContent.match(/<span class="flag:([A-Z]{2})"/);
      const nationalityCode = nationalityMatch ? nationalityMatch[1] : 'PT';

      // Extract age (optional)
      const ageMatch = staffContent.match(/<span>(\d+)\s*anos<\/span>/);
      const age = ageMatch ? parseInt(ageMatch[1]) : null;

      // Find which position this player belongs to
      let position = 'Unknown';
      const staffIndex = start;
      for (let j = positionTitles.length - 1; j >= 0; j--) {
        if (positionTitles[j].index < staffIndex) {
          position = positionTitles[j].title;
          break;
        }
      }

      players.push({
        name,
        position: normalizePosition(position),
        age,
        number,
        nationality: getNationalityFromCode(nationalityCode),
      });
    } catch (error) {
      console.error(`Error parsing player from staff div:`, error);
    }
  }

  console.log(`Extracted ${players.length} players for ${teamName}`);

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
    return 'Fixo/Winger'; // Versatile defender/winger
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
  
  return position; // Return original if no match
}

/**
 * Delay function for respectful scraping
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scrape all teams
 */
async function scrapeAllTeams(): Promise<ScrapedData> {
  const teams: TeamData[] = [];
  
  console.log(`Starting to scrape ${TEAM_URLS.length} teams...\n`);

  for (let i = 0; i < TEAM_URLS.length; i++) {
    const team = TEAM_URLS[i];
    
    try {
      console.log(`[${i + 1}/${TEAM_URLS.length}] Scraping ${team.name}...`);
      
      const html = await fetchHTML(team.url);
      const players = parsePlayerData(html, team.name);
      
      teams.push({
        teamName: team.name,
        teamUrl: team.url,
        players,
      });

      console.log(`✓ Found ${players.length} players for ${team.name}\n`);

      // Wait before next request
      if (i < TEAM_URLS.length - 1) {
        console.log(`Waiting ${DELAY_BETWEEN_REQUESTS}ms before next request...`);
        await delay(DELAY_BETWEEN_REQUESTS);
      }
    } catch (error) {
      console.error(`✗ Failed to scrape ${team.name}:`, error);
      teams.push({
        teamName: team.name,
        teamUrl: team.url,
        players: [],
      });
    }
  }

  return {
    season: '2024/2025',
    competition: 'Liga Placard (Portuguese Futsal League)',
    scrapedAt: new Date().toISOString(),
    teams,
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
  const totalPlayers = data.teams.reduce((sum, team) => sum + team.players.length, 0);
  const teamsWithPlayers = data.teams.filter(team => team.players.length > 0).length;
  
  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING SUMMARY');
  console.log('='.repeat(60));
  console.log(`Competition: ${data.competition}`);
  console.log(`Season: ${data.season}`);
  console.log(`Teams scraped: ${data.teams.length}`);
  console.log(`Teams with data: ${teamsWithPlayers}`);
  console.log(`Total players: ${totalPlayers}`);
  console.log(`Average players per team: ${(totalPlayers / teamsWithPlayers).toFixed(1)}`);
  console.log('='.repeat(60) + '\n');

  // Per-team breakdown
  console.log('Per-Team Breakdown:');
  console.log('-'.repeat(60));
  data.teams.forEach(team => {
    console.log(`${team.teamName.padEnd(25)} ${team.players.length} players`);
  });
  console.log('-'.repeat(60) + '\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('ZeroZero.pt Player Scraper');
  console.log('Portuguese Futsal League 2024/2025');
  console.log('='.repeat(60) + '\n');

  try {
    const data = await scrapeAllTeams();
    
    // Save to JSON
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `portuguese-futsal-players-${timestamp}.json`;
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
