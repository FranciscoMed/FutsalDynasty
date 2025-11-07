# UEFA Futsal API Reference

## Overview
This document provides quick reference for the UEFA public APIs used for futsal data scraping.

---

## 1. Fixtures/Matches API

### Endpoint
```
GET https://match.uefa.com/v5/matches
```

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `competitionId` | number | Yes | Competition ID (27 for Futsal CL) | `27` |
| `seasonYear` | number | Yes | Season year | `2026` |
| `fromDate` | string | No | Start date (YYYY-MM-DD) | `2025-08-01` |
| `toDate` | string | No | End date (YYYY-MM-DD) | `2025-08-31` |
| `limit` | number | No | Results per page (max 50) | `50` |
| `offset` | number | No | Pagination offset | `0` |
| `order` | string | No | Sort order | `ASC` or `DESC` |
| `phase` | string | No | Tournament phase | `ALL`, `QUALIFYING`, `TOURNAMENT` |
| `utcOffset` | number | No | UTC offset for times | `1` |

### Example Request
```
https://match.uefa.com/v5/matches?competitionId=27&fromDate=2025-08-01&limit=50&offset=0&order=ASC&phase=ALL&seasonYear=2026&toDate=2025-08-31&utcOffset=1
```

### Response Structure
Returns an array of match objects with:
- Match IDs and status
- Home/Away team information
- Competition and round details
- Score information
- Player events (goals with timestamps)
- Referee information
- Stadium and attendance data
- Kick-off times

### Key Fields

**Match Status:**
- `FINISHED` - Completed match with full data
- `LIVE` - Match in progress
- `SCHEDULED` - Upcoming match
- `POSTPONED` - Delayed match

**Lineup Status:**
- `AVAILABLE` - Full lineup data available
- `TACTICAL_AVAILABLE` - Tactical lineup available
- `NOT_AVAILABLE` - No lineup data

**Player Events:**
```json
"playerEvents": {
  "scorers": [
    {
      "goalType": "SCORED",
      "phase": "FIRST_HALF",
      "player": { /* player details */ },
      "time": {
        "minute": 4,
        "second": 16
      }
    }
  ]
}
```

---

## 2. Match Statistics API

### Endpoint
```
GET https://matchstats.uefa.com/v2/team-statistics/{matchId}
```

### Path Parameters
- `matchId` - The unique match identifier (e.g., `2045691`)

### Example Request
```
https://matchstats.uefa.com/v2/team-statistics/2045691
```

### Response Structure
Returns array with 2 team statistics objects (home/away):

```json
[
  {
    "teamId": "2605071",
    "statistics": [
      {
        "name": "goals",
        "value": "0"
      },
      {
        "name": "attempts",
        "value": "22"
      },
      {
        "name": "attempts_on_target",
        "value": "8"
      },
      // ... more stats
    ]
  },
  {
    "teamId": "78223",
    "statistics": [ /* away team stats */ ]
  }
]
```

### Available Statistics

| Statistic Name | Description |
|----------------|-------------|
| `goals` | Total goals scored |
| `attempts` | Total shot attempts |
| `attempts_on_target` | Shots on target |
| `attempts_off_target` | Shots off target |
| `attempts_blocked` | Shots blocked |
| `attempts_saved` | Shots saved by keeper |
| `attempts_accuracy` | Shot accuracy percentage |
| `attempts_on_woodwork` | Hits on post/bar |
| `fouls_committed` | Fouls committed |
| `fouls_suffered` | Fouls suffered |
| `yellow_cards` | Yellow cards received |
| `red_cards` | Red cards received |
| `corners` | Corner kicks |
| `assists` | Goal assists |
| `free_kicks_on_goal` | Free kicks on goal |
| `own_goals_for` | Own goals scored |
| `played_time` | Minutes played |

---

## 3. Live Events API (Optional)

### Endpoint
```
GET https://editorial.uefa.com/api/liveblogs/{blogId}/posts
```

### Query Parameters
- `aggregator=lightliveblogjson` (required)
- `from={postId}` - Starting post ID for pagination
- `includeReactions=true` - Include reaction data
- `limit={number}` - Number of events (default 10)

### Example Request
```
https://editorial.uefa.com/api/liveblogs/029d-1ecc85c36d78-d2f92150a06d-1012/posts?aggregator=lightliveblogjson&from=029d-1f19bcd43a1d-1b81c27542f4-10ff&includeReactions=true&limit=10
```

### Finding Blog IDs
⚠️ **Note:** Blog IDs are not directly provided in the match API. Options:
1. Extract from match page HTML
2. Pattern recognition from known IDs
3. Skip this API and use match info + statistics instead

### Event Types
When blog ID is available, events include:
- `GOAL` - Goal scored
- `SHOT_ON_GOAL` - Shot on target
- `SHOT_WIDE` - Shot off target
- `SHOT_BLOCKED` - Blocked shot
- `SAVE` - Goalkeeper save
- `FOUL` - Foul committed
- `CORNER` - Corner kick
- `YELLOW_CARD` - Yellow card
- `RED_CARD` - Red card
- `SUBSTITUTION` - Player substitution

### Event Data Structure
```json
{
  "lbPostFSPEvent": {
    "eventId": "uuid",
    "eventType": "SHOT_WIDE",
    "eventSubType": "POST",
    "eventPhase": "SECOND_HALF",
    "eventMinute": "28",
    "eventSecond": "38",
    "eventDisplayMinute": "28'38''",
    "idMatch": "2045691",
    "idPlayer": "250122310",
    "namePlayer": "Vitor Hugo",
    "fieldPositionPlayer": "Avançado",
    "idTeam": "2605071"
  }
}
```

---

## Data Collection Best Practices

### 1. Rate Limiting
- Max 2 requests/second recommended
- Implement exponential backoff
- Add delays between batch requests

```typescript
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRateLimit(url: string) {
  await delay(500); // 2 req/sec
  return fetch(url);
}
```

### 2. Error Handling
```typescript
async function safeFetch(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      if (response.status === 404) break; // Don't retry 404s
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}
```

### 3. Data Validation
```typescript
function isCompleteMatch(match: any): boolean {
  return (
    match.status === 'FINISHED' &&
    match.score?.total &&
    (match.lineupStatus === 'AVAILABLE' || 
     match.lineupStatus === 'TACTICAL_AVAILABLE')
  );
}
```

### 4. Pagination
```typescript
async function fetchAllMatches(seasonYear: number): Promise<Match[]> {
  const matches: Match[] = [];
  let offset = 0;
  const limit = 50;
  
  while (true) {
    const batch = await fetchFixtures({ seasonYear, offset, limit });
    if (batch.length === 0) break;
    matches.push(...batch);
    offset += limit;
    if (batch.length < limit) break; // Last page
  }
  
  return matches;
}
```

---

## Sample Data Files

You already have excellent sample data:

### 1. `Fixtures.json`
- 117,454 lines of fixture data
- Multiple seasons (2023-2026)
- Complete match information
- All phases and rounds
- **Use this as primary data source!**

### 2. `MatchInfo.json`
- Single match detailed info
- Example match ID: 2035347
- Shows complete data structure

### 3. `Statistics.json`
- Team statistics for match 2035347
- Both teams' complete stats
- All metric examples

### 4. `Events.json`
- 10 live events sample
- Event timing and types
- Player information per event

---

## Quick Start Guide

### Step 1: Extract Match IDs from Existing Data
```typescript
import fixturesData from './Fixtures.json';

const finishedMatches = fixturesData.filter(m => 
  m.status === 'FINISHED' && 
  m.lineupStatus === 'AVAILABLE'
);

const matchIds = finishedMatches.map(m => m.id);
console.log(`Found ${matchIds.length} complete matches`);
```

### Step 2: Fetch Statistics for Each Match
```typescript
for (const matchId of matchIds) {
  const stats = await fetch(
    `https://matchstats.uefa.com/v2/team-statistics/${matchId}`
  ).then(r => r.json());
  
  // Process stats...
  await delay(500); // Rate limiting
}
```

### Step 3: Analyze and Aggregate
```typescript
const allStats = {
  totalMatches: 0,
  totalGoals: 0,
  totalShots: 0,
  // ... aggregate statistics
};

// Process each match...
```

---

## Useful Filters

### Get All Finished Matches
```typescript
matches.filter(m => m.status === 'FINISHED')
```

### Get Matches with Lineups
```typescript
matches.filter(m => 
  m.lineupStatus === 'AVAILABLE' || 
  m.lineupStatus === 'TACTICAL_AVAILABLE'
)
```

### Get Matches by Season
```typescript
matches.filter(m => m.seasonYear === '2026')
```

### Get Matches by Phase
```typescript
matches.filter(m => m.round.phase === 'QUALIFYING')
```

### Get High-Scoring Matches
```typescript
matches.filter(m => 
  (m.score?.total?.home + m.score?.total?.away) >= 8
)
```

### Get Matches with Events Data
```typescript
matches.filter(m => 
  m.playerEvents?.scorers && 
  m.playerEvents.scorers.length > 0
)
```

---

## Data Quality Indicators

### Complete Match Criteria
✅ `status === "FINISHED"`
✅ `lineupStatus !== "NOT_AVAILABLE"`  
✅ `score.total` exists
✅ `playerEvents.scorers` exists
✅ `fullTimeAt` exists

### Red Flags
❌ `status !== "FINISHED"`
❌ Missing score data
❌ No player events
❌ Match attendance = 0 (possibly incorrect data)

---

## Competition IDs

| Competition | ID |
|-------------|-----|
| UEFA Futsal Champions League | 27 |
| (Add others as discovered) | |

---

## Season Years

Available seasons in your data:
- 2023 (historical)
- 2024 (historical)
- 2025 (recent)
- 2026 (current/upcoming)

---

## Next Steps

1. ✅ You already have Fixtures.json with comprehensive data
2. 📊 Extract match IDs from existing fixtures
3. 🔍 Fetch statistics for each match using statistics API
4. 📈 Analyze and aggregate the data
5. 🎮 Integrate findings into game engine

No need to scrape fixtures - you already have them! Focus on statistics API.
