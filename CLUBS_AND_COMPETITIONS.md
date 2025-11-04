# Clubs and Competitions Guide

## Overview

The Futsal Manager game now features an extensive database of 100+ fictitious clubs organized across three different competitions, providing a rich and diverse competitive ecosystem.

## Total Club Count

- **First Division**: 12 teams (player team + 11 AI teams)
- **Second Division**: 12 AI teams
- **National Cup**: 16 AI teams
- **Total**: 40 AI teams + player team = **41 total teams**

## Club Database

### Complete List of 100+ Fictitious Clubs

The game includes clubs organized by thematic categories:

#### Space & Cosmos (12 clubs)
- Cosmos FC, Galaxy Stars, Stellar FC, Nova United, Meteor FC
- Neptune United, Jupiter FC, Saturn United, Mars FC, Venus United
- Orion FC, Andromeda United

#### Weather & Elements (15 clubs)
- Thunder FC, Lightning FC, Tempest FC, Storm Athletic, Hurricane FC
- Tornado United, Cyclone FC, Vortex United, Blaze United, Inferno FC
- Avalanche FC, Glacier United, Frost FC, Ice Warriors, Polar United

#### Animals & Wildlife (20 clubs)
- Dragon United, Griffin FC, Pegasus FC, Eagle United, Falcon FC
- Hawk United, Raven FC, Wolf United, Lion FC, Tiger United
- Panther FC, Jaguar United, Cheetah FC, Leopard United, Bear FC
- Shark United, Dolphin FC, Whale United, Viper FC, Cobra United

#### Precious Materials & Minerals (14 clubs)
- Diamond United, Crystal FC, Emerald FC, Sapphire United, Ruby FC
- Jade United, Opal FC, Platinum United, Gold FC, Silver United
- Bronze FC, Iron Warriors, Steel United, Titanium FC

#### Warriors & Legends (8 clubs)
- Knight FC, Warrior United, Spartan FC, Gladiator United
- Champion FC, Titans United, Apex Warriors, Phoenix FC

#### General Athletic Clubs (12 clubs)
- City Warriors, United Stars, Athletic Club, Sporting FC, Rangers FC
- Dynamo United, Olympia FC, Victory United, Royal FC, Crown Athletic
- Empire Futsal, Zenith FC

#### Nature & Geography (10 clubs)
- Summit FC, Peak United, Horizon FC, Eclipse United, Velocity United
- Arctic FC, Volcano United, Lava FC, Magma United, others

#### Aquatic & Reptiles (9 clubs)
- Python FC, Scorpion United, Spider FC, Rhino United, Buffalo FC
- Bison United, Mustang FC, Stallion United, and more

## Competition Structure

### 1. First Division League
**Type**: League (Round-Robin)

**Participants**: 12 teams
- Player's team (reputation varies)
- 11 AI teams (reputation: 40-70)

**Format**:
- Double round-robin (home and away)
- 22 matchdays total
- 3 points for win, 1 for draw, 0 for loss
- Standings tracked by points, goal difference, goals scored

**Clubs** (indices 0-11):
- City Warriors, United Stars, Athletic Club, Sporting FC
- Rangers FC, Dynamo United, Olympia FC, Phoenix FC
- Titans United, Lightning FC, Thunder FC

### 2. Second Division League
**Type**: League (Round-Robin)

**Participants**: 12 AI teams
- All AI-controlled teams
- Reputation range: 30-50 (lower than First Division)

**Format**:
- Double round-robin (home and away)
- 22 matchdays total
- Same point system as First Division

**Clubs** (indices 12-23):
- Cosmos FC, Victory United, Royal FC, Crown Athletic
- Empire Futsal, Galaxy Stars, Stellar FC, Nova United
- Zenith FC, Apex Warriors, Summit FC, Peak United

**Future Feature**: Promotion/relegation system between divisions

### 3. National Cup
**Type**: Knockout Tournament

**Participants**: 16 AI teams
- All AI-controlled teams
- Reputation range: 35-65 (mixed quality)

**Format**:
- Single-elimination bracket
- 4 rounds total:
  - Round of 16 (8 matches)
  - Quarter-finals (4 matches)
  - Semi-finals (2 matches)
  - Final (1 match)
- No replays - winner advances immediately

**Clubs** (indices 24-39):
- Horizon FC, Eclipse United, Meteor FC, Velocity United
- Tempest FC, Blaze United, Inferno FC, Vortex United
- Cyclone FC, Storm Athletic, Hurricane FC, Tornado United
- Avalanche FC, Glacier United, Frost FC, Ice Warriors

## Team Characteristics

### Squad Composition
Each AI team has:
- **13 players** total
  - 2 Goalkeepers
  - 4 Defenders
  - 4 Wingers
  - 3 Pivots

### Team Attributes
- **Reputation**: 30-70 (varies by competition)
- **Budget**: $300,000 - $700,000
- **Wage Budget**: $30,000 - $70,000 per month
- **Stadium**: Named after the club
- **Formation**: 2-2 (default)
- **Tactical Preset**: Balanced (default)

### Player Diversity
Players generated with:
- Brazilian names (15 first names × 15 last names = 225 combinations)
- Ages: 18-31 years
- Attributes based on team reputation
- Position-specific skills
- Goalkeeper-specific attributes (reflexes, handling, positioning, distribution)

## How to Access Multiple Competitions

### In the Game UI

1. **Matches Page**
   - View all competitions
   - Each competition shows separately with its own fixtures
   - League standings displayed for division competitions
   - Cup bracket progression for knockout tournament

2. **Competition Selection**
   - Switch between First Division, Second Division, and National Cup
   - View fixtures for each competition
   - Simulate matches across all competitions

### Re-initializing the Game

If you started the game before this update, you'll need to re-initialize to see all three competitions:

1. **Option A**: Start a fresh game
   - This will create all 40+ teams across 3 competitions

2. **Option B**: Clear database and re-initialize
   - Use `npm run db:push --force` to reset
   - Re-initialize game through the UI

## Competition Schedule

### Timeline
- **First Division**: Starts August 15
  - Weekly matches through May
  - 22 matchdays over ~5.5 months

- **Second Division**: Starts August 15
  - Runs parallel to First Division
  - Same duration and format

- **National Cup**: Starts September 1
  - Round of 16: Early September
  - Quarter-finals: Mid-September  
  - Semi-finals: Late September
  - Final: Early October

## Database Schema

### Teams Table
```typescript
{
  id: number
  name: string
  abbreviation: string (3 letters)
  reputation: number (30-70)
  budget: number
  wageBudget: number
  stadium: string
  formation: Formation
  tacticalPreset: TacticalPreset
  startingLineup: number[]
  substitutes: number[]
  isPlayerTeam: boolean
}
```

### Competitions Table
```typescript
{
  id: number
  name: string
  type: "league" | "cup"
  season: number
  teams: number[] (team IDs)
  fixtures: Match[]
  standings: LeagueStanding[] (for leagues only)
  currentMatchday: number
  totalMatchdays: number
}
```

## Future Enhancements

### Planned Features
- **Promotion/Relegation**: Top teams from Second Division move up, bottom teams from First Division move down
- **Cup with First Division**: Include player's team in National Cup
- **Continental Competition**: Champions League-style tournament for top teams
- **Super Cup**: Match between league winner and cup winner
- **Multiple Domestic Cups**: FA Cup, League Cup equivalents
- **Regional Tournaments**: Geographic-based competitions

### Additional Club Features
- Club history and trophies
- Rivalries between specific clubs
- Club-specific playing styles
- Dynamic reputation changes
- Financial fair play constraints

## Technical Implementation

### Competition Engine Methods

```typescript
// Create First Division (with player team)
await competitionEngine.createLeagueCompetition(season, playerTeamId);

// Create Second Division (AI only)
await competitionEngine.createSecondDivisionLeague(season);

// Create National Cup (AI only, knockout)
await competitionEngine.createCupCompetition(season);
```

### Team Generation

```typescript
// Generate teams with custom parameters
generateAITeams(
  count: number,           // Number of teams to create
  startIndex: number,      // Starting index in club names array
  minReputation: number,   // Minimum reputation
  maxReputation: number    // Maximum reputation
)
```

### Fixture Generation

**League Format**:
- Round-robin algorithm ensures fair home/away distribution
- Each team plays every other team twice
- Fixtures spread over season based on matchday frequency

**Cup Format**:
- Single-elimination bracket
- Random draw for each round
- Winners advance, losers eliminated
- No extra time or penalties (decided in regular time)

## Statistics & Records

The game tracks across all competitions:
- Total goals scored
- Clean sheets
- Win/loss/draw records
- Head-to-head results
- Competition-specific statistics
- Player performance across competitions

## Summary

With **100+ fictitious clubs** across **3 competitions**, the Futsal Manager game provides:
- Rich competitive ecosystem
- Diverse team qualities and styles
- Multiple pathways to success
- Realistic tournament structures
- Extensive database for transfers and scouting
- Long-term gameplay potential

The expanded club database creates a living, breathing futsal world for players to manage their team through multiple seasons and competitions!
