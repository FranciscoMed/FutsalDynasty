# ZeroZero.pt Competition Scraper

## Overview

A versatile web scraper that extracts teams from Portuguese futsal competition standings and scrapes complete player data for all teams. This scraper automatically discovers teams from competition pages, making it easy to collect data from entire leagues.

## Features

- 🏆 **Competition-Based Scraping**: Provide competition URLs and the scraper automatically extracts all teams
- 📊 **League Table Parsing**: Automatically discovers teams from standings tables
- 👥 **Complete Player Data**: Extracts name, position, age, squad number, and nationality
- 🌍 **Portuguese Character Support**: Properly handles Portuguese names (á, é, ã, ç, etc.)
- 📁 **Structured Output**: Organized JSON format with competitions, teams, and players
- 🤖 **Respectful Scraping**: Built-in delays between requests
- 📈 **Progress Tracking**: Real-time console output with detailed statistics

## Current Configuration

The scraper is configured to scrape **II Divisão Futsal (2025/2026 season)**:

- **Serie A**: 12 teams, 204 players
- **Serie B**: 12 teams, 219 players
- **Total**: 24 teams, 423 players

### Competition URLs

```typescript
const COMPETITION_URLS = [
  'https://www.zerozero.pt/edicao/ii-divisao-futsal-serie-a-2025-26/204304',
  'https://www.zerozero.pt/edicao/ii-divisao-futsal-serie-b-2025-26/204305',
];
```

## Usage

### Run the Scraper

```bash
npm run zerozero:scrape-competition
```

### Output File

Data is saved to: `data/zerozero/segunda-liga-{date}.json`

Example: `segunda-liga-2025-11-12.json`

## Output Structure

```json
{
  "season": "2025/2026",
  "scrapedAt": "2025-11-12T01:09:17.946Z",
  "competitions": [
    {
      "competitionName": "II Divisão Futsal Série A 2025/26",
      "competitionUrl": "https://www.zerozero.pt/edicao/...",
      "teams": [
        {
          "teamName": "Marítimo",
          "teamUrl": "https://www.zerozero.pt/equipa/maritimo/14916?epoca_id=155",
          "players": [
            {
              "name": "Martim Peixoto",
              "position": "Goalkeeper",
              "age": 19,
              "number": null,
              "nationality": "Portugal"
            }
          ]
        }
      ]
    }
  ]
}
```

## How It Works

### 1. Competition Page Scraping

The scraper fetches the competition standings page and extracts:
- Competition name
- All teams in the standings table
- Team URLs with correct season parameter

### 2. Team Discovery

From the standings table HTML, the scraper identifies:
```html
<table class="zztable stats">
  <tbody>
    <tr>
      <td><a href="/equipa/{team-slug}/{team-id}?epoca_id={season}">Team Name</a></td>
    </tr>
  </tbody>
</table>
```

### 3. Player Extraction

For each team, the scraper navigates to the team page and extracts player data from:
```html
<div id="team_squad">
  <div class="title">Guarda-Redes</div>
  <div class="staff">
    <div class="number">1</div>
    <div class="name">
      <a href="/jogador/...">Player Name</a>
    </div>
    <span class="flag:PT"></span>
    <span>25 anos</span>
  </div>
</div>
```

## Customization

### Adding Different Competitions

Edit `scripts/zerozero/scrape-competition.ts`:

```typescript
const COMPETITION_URLS = [
  'https://www.zerozero.pt/edicao/liga-placard-2024-25/204001',
  'https://www.zerozero.pt/edicao/taca-de-portugal-2024-25/204002',
  // Add more competition URLs here
];
```

### Changing Season

Update the `SEASON_ID` constant:

```typescript
const SEASON_ID = '156'; // For 2025/2026 season
```

### Adjusting Rate Limits

```typescript
const DELAY_BETWEEN_REQUESTS = 2000; // Between competitions (ms)
const DELAY_BETWEEN_TEAMS = 1500;    // Between teams (ms)
```

### Changing Output Filename

Edit the `main()` function:

```typescript
const filename = `my-custom-name-${timestamp}.json`;
```

## Data Fields

### Player Data

| Field | Type | Description | Optional |
|-------|------|-------------|----------|
| `name` | string | Player's full name | No |
| `position` | string | Normalized position | No |
| `age` | number | Player's age in years | Yes |
| `number` | number | Squad number | Yes |
| `nationality` | string | Full nationality name | Yes (defaults to Portugal) |

### Position Types

The scraper normalizes Portuguese position names to standard formats:

- **Goalkeeper** (Guarda-Redes)
- **Fixo** (Defender)
- **Winger** (Ala)
- **Pivot** (Pivot)
- **Fixo/Winger** (Versatile player)
- **Universal** (Can play multiple positions)

### Supported Nationalities

Portuguese (`PT`), Brazilian (`BR`), Spanish (`ES`), Argentinian (`AR`), Italian (`IT`), French (`FR`), Kazakh (`KZ`), Russian (`RU`), Ukrainian (`UA`), Cape Verdean (`CV`), Angolan (`AO`), Mozambican (`MZ`), Guinea-Bissau (`GW`), São Toméan (`ST`), Venezuelan (`VE`), Colombian (`CO`), Uruguayan (`UY`)

## Console Output

```
╔════════════════════════════════════════════════════════════════════╗
║  ZeroZero.pt Competition Scraper                                   ║
║  Versatile scraper for Portuguese futsal competitions              ║
╚════════════════════════════════════════════════════════════════════╝

[============================================================]
Competition 1: https://www.zerozero.pt/edicao/...
[============================================================]

  Competition: II Divisão Futsal Série A 2025/26
  ✓ Found 12 teams in standings

  Scraping team players...
    [1/12] Scraping Marítimo...
    ✓ Found 15 players for Marítimo
    [2/12] Scraping Modicus...
    ✓ Found 16 players for Modicus
    ...

  ✓ Competition complete: 12 teams, 204 players

======================================================================
SCRAPING SUMMARY
======================================================================
Season: 2025/2026
Competitions scraped: 2
Total teams: 24
Total players: 423
Average players per team: 17.6
======================================================================

Competition 1: II Divisão Futsal Série A 2025/26
  Teams: 12
  Players: 204
  Teams:
    - Marítimo                       15 players
    - Modicus                        16 players
    ...
```

## Implementation Details

### Team Discovery Algorithm

1. **Fetch Competition Page**: GET request to competition standings URL
2. **Parse HTML Table**: Extract `<table class="zztable stats">`
3. **Extract Team Links**: Find all `<a href="/equipa/...">` elements
4. **Deduplicate**: Use Set to avoid duplicate team IDs (teams appear multiple times in table)
5. **Build Full URLs**: Construct complete URLs with correct season parameter

### Player Extraction Algorithm

1. **Find Squad Section**: Locate `<div id="team_squad">`
2. **Track Positions**: Extract all `<div class="title">` for position headers
3. **Find Player Divs**: Locate all `<div class="staff">` start positions
4. **Substring Extraction**: Extract content between consecutive staff divs
5. **Parse Fields**: Use individual regex for each field (all optional except name)
6. **Assign Position**: Compare player index with position title indices

### Encoding Handling

```typescript
// Try UTF-8 first
let text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);

// Fallback to ISO-8859-1 if replacement characters found
if (text.includes('�')) {
  text = new TextDecoder('iso-8859-1').decode(buffer);
}
```

## Troubleshooting

### No Teams Found

**Problem**: Scraper reports "Found 0 teams in standings"

**Solutions**:
- Verify the competition URL is correct
- Check if the page structure has changed
- Ensure the standings table exists on the page

### Missing Players

**Problem**: Some players are not being extracted

**Solutions**:
- Check if player divs follow the standard `<div class="staff">` structure
- Verify players have at least a name (required field)
- Look for JavaScript-rendered content (this scraper only handles static HTML)

### Encoding Issues

**Problem**: Portuguese characters display incorrectly (� symbols)

**Solutions**:
- The scraper automatically detects and switches encoding
- If issues persist, manually check the website's encoding
- Update the `fetchHTML()` function with correct encoding

### Rate Limiting / Blocking

**Problem**: Requests are being blocked or throttled

**Solutions**:
- Increase delays: `DELAY_BETWEEN_TEAMS = 3000` (3 seconds)
- Check your IP hasn't been rate-limited
- Verify User-Agent header is being sent correctly

## Statistics (Last Run)

**Date**: November 12, 2025

**II Divisão Futsal Série A (2025/26)**:
- Marítimo: 15 players
- Modicus: 16 players
- Valpaços Futsal: 15 players
- Viseu 2001/Palácio do Gelo: 17 players
- Nogueiró e Tenões: 16 players
- Amigos de Cerva: 15 players
- Dínamo Sanjoanense: 16 players
- AD Jorge Antunes: 15 players
- Arsenal Maia: 14 players
- Boavista FC: 18 players
- CS São João: 18 players
- Nun´Álvares: 29 players

**II Divisão Futsal Série B (2025/26)**:
- Bairro Boa Esperança: 18 players
- Belenenses: 19 players
- AMSAC: 20 players
- ACD Ladoeiro: 15 players
- Burinhosa: 21 players
- SC Barbarense: 18 players
- Portimonense: 15 players
- UPVN: 17 players
- Albufeira Futsal: 16 players
- Reguilas Tires: 17 players
- Leões Porto Salvo: 26 players
- GDCP Livramento: 17 players

**Totals**: 24 teams, 423 players, 17.6 avg per team

## Future Enhancements

- [ ] Add support for multiple seasons in one run
- [ ] Export to CSV format option
- [ ] Add retry logic for failed requests
- [ ] Support for cup competitions (knockout format)
- [ ] Player statistics scraping (goals, assists, etc.)
- [ ] Team statistics extraction
- [ ] Fixture and results scraping
- [ ] Integration with Cheerio for more robust parsing
- [ ] CLI arguments for dynamic configuration
- [ ] Progress bar instead of console logs
- [ ] Validation against database schema

## Legal & Ethical Considerations

- **Respectful Scraping**: Built-in delays to avoid overloading servers
- **Public Data**: Only scrapes publicly available information
- **Attribution**: Data sourced from ZeroZero.pt
- **Personal Use**: Intended for modding and personal projects
- **Rate Limiting**: Configurable delays between requests
- **No Authentication**: Does not bypass any login or paywall

## Related Scripts

- **`scrape-players.ts`**: Original scraper with hardcoded team URLs (Liga Placard)
- **`scrape-competition.ts`**: This versatile competition-based scraper (II Divisão)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify the HTML structure hasn't changed on ZeroZero.pt
3. Review console output for specific error messages
4. Check the generated JSON file for data quality

## License

This scraper is for educational and personal use. Please respect ZeroZero.pt's terms of service and rate limits.
