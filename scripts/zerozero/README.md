# ZeroZero.pt Player Scraper

Web scraper to extract player data from Portuguese futsal teams on ZeroZero.pt for game modding purposes.

## Features

- Scrapes 12 Portuguese futsal teams from Liga Placard 2024/2025
- Extracts player information: name, position, age, number, nationality
- Saves data in JSON format ready for modding
- Respectful scraping with 2-second delays between requests
- Detailed console output with progress tracking

## Teams Included

1. **Benfica** - Historic Lisbon club
2. **Sporting** - Lisbon rivals
3. **Leões Porto Salvo** - Multiple-time champions
4. **Ferreira do Zêzere** - Central Portugal
5. **SC Braga** - Northern powerhouse
6. **FC Famalicão** - Rising team
7. **Rio Ave** - Vila do Conde club
8. **Torreense** - Torres Vedras
9. **ADCR Caxinas** - Póvoa de Varzim
10. **Quinta dos Lombos** - Azores representatives
11. **Eléctrico** - Funchal, Madeira
12. **AD Fundão** - Beira Interior

## Usage

Run the scraper:

```bash
npm run zerozero:scrape-players
```

## Output

The script creates a JSON file in `data/zerozero/` with the following structure:

```json
{
  "season": "2024/2025",
  "competition": "Liga Placard (Portuguese Futsal League)",
  "scrapedAt": "2024-11-12T...",
  "teams": [
    {
      "teamName": "Benfica",
      "teamUrl": "https://www.zerozero.pt/equipa/benfica/4368?epoca_id=155",
      "players": [
        {
          "name": "André Sousa",
          "position": "Goalkeeper",
          "age": 28,
          "number": 1,
          "nationality": "Portugal"
        }
        // ... more players
      ]
    }
    // ... more teams
  ]
}
```

## Data Fields

### Player Object

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Player's full name |
| `position` | `string` | Position (Goalkeeper, Fixo, Winger, Pivot, Universal, Unknown) |
| `age` | `number \| null` | Player's age if available |
| `number` | `number \| null` | Squad number if available |
| `nationality` | `string \| null` | Player's nationality (defaults to Portugal) |

### Position Types

- **Goalkeeper** - Guarda-Redes (GR)
- **Fixo** - Defender/Last man
- **Winger** - Ala (Wing player)
- **Pivot** - Central attacker
- **Universal** - Versatile player
- **Unknown** - Position not detected

## Implementation Details

### Parsing Strategy

The scraper uses multiple parsing strategies to extract data:

1. **Primary Method**: Regex patterns to match player table rows
2. **Alternative Method**: Fallback to extract player names from links
3. **Position Normalization**: Converts Portuguese positions to standard formats
4. **Nationality Detection**: Extracts from flag images or defaults to Portugal

### Rate Limiting

- **2-second delay** between team requests
- Respectful user-agent headers
- Error handling with graceful fallbacks

### Error Handling

- Continues scraping even if individual teams fail
- Logs errors without stopping execution
- Empty player arrays for failed teams

## Output Files

Files are saved in `data/zerozero/` directory:

```
data/zerozero/
└── portuguese-futsal-players-2024-11-12.json
```

Filename includes scraping date for version tracking.

## Console Output

The scraper provides detailed console output:

```
ZeroZero.pt Player Scraper
Portuguese Futsal League 2024/2025
============================================================

[1/12] Scraping Benfica...
Fetching: https://www.zerozero.pt/equipa/benfica/4368?epoca_id=155
Found 15 potential player rows for Benfica
✓ Found 15 players for Benfica

Waiting 2000ms before next request...

[2/12] Scraping Sporting...
...

============================================================
SCRAPING SUMMARY
============================================================
Competition: Liga Placard (Portuguese Futsal League)
Season: 2024/2025
Teams scraped: 12
Teams with data: 12
Total players: 180
Average players per team: 15.0
============================================================

Per-Team Breakdown:
------------------------------------------------------------
Benfica                   15 players
Sporting                  15 players
...
------------------------------------------------------------

✓ Data saved to: c:\...\data\zerozero\portuguese-futsal-players-2024-11-12.json
✓ Scraping completed successfully!

You can now use this JSON file for modding your game.
```

## Modding Integration

To use the scraped data in your game:

1. Load the JSON file:
```typescript
import playerData from '@/data/zerozero/portuguese-futsal-players-2024-11-12.json';
```

2. Map to your game schema:
```typescript
import type { Player, Team } from '@shared/schema';

function convertToGameData(scrapedData: ScrapedData) {
  const teams: Team[] = scrapedData.teams.map(teamData => ({
    name: teamData.teamName,
    // ... map other team fields
  }));

  const players: Player[] = scrapedData.teams.flatMap(teamData =>
    teamData.players.map(player => ({
      name: player.name,
      position: mapPosition(player.position),
      age: player.age || 25,
      // ... map other player fields
    }))
  );

  return { teams, players };
}
```

3. Import into database:
```typescript
// Example seed function
async function seedPortugueseLeague(storage: IStorage) {
  const { teams, players } = convertToGameData(playerData);
  
  for (const team of teams) {
    await storage.createTeam(team);
  }
  
  for (const player of players) {
    await storage.createPlayer(player);
  }
}
```

## Troubleshooting

### No players found

If the scraper returns empty player arrays:
- ZeroZero.pt may have changed their HTML structure
- Update the regex patterns in `parsePlayerData()`
- Check console logs for specific error messages

### HTTP errors

If you get 403/429 errors:
- Increase `DELAY_BETWEEN_REQUESTS` to be more respectful
- Check if your IP has been rate-limited
- Try again after a few hours

### Incomplete data

If some fields are `null`:
- Not all teams provide complete data on ZeroZero
- Some teams may not list player numbers or ages
- This is expected behavior

## Legal & Ethical Considerations

⚠️ **Important Notes:**

1. **For personal/educational use only** - Do not use for commercial purposes
2. **Respect robots.txt** - Currently ZeroZero.pt doesn't block this scraping
3. **Rate limiting** - Script includes delays to be respectful
4. **Data accuracy** - ZeroZero.pt data may not always be up-to-date
5. **Terms of Service** - Review ZeroZero.pt TOS before scraping

This scraper is designed for educational purposes and personal game modding. Always respect the source website's terms of service and rate limits.

## Future Improvements

Potential enhancements:

- [ ] Add support for more leagues/competitions
- [ ] Extract player statistics (goals, assists, etc.)
- [ ] Add player photos/images
- [ ] Support multiple seasons
- [ ] Add team logos
- [ ] Extract player contracts/values
- [ ] Add player history/career data

## Contributing

To add more teams or improve parsing:

1. Add team URLs to `TEAM_URLS` array
2. Test parsing with: `npm run zerozero:scrape-players`
3. Update regex patterns if HTML structure changes
4. Submit improvements via pull request

## License

This scraper is part of the Futsal Manager project and follows the same MIT license.
