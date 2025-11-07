# UEFA Futsal Data Scraper - Implementation Plan

## Overview
This plan outlines the implementation of a comprehensive data scraping and analysis system for UEFA futsal matches. The system will collect match statistics, events, and general match information to provide insights into event distribution, timing patterns, and average statistics across futsal matches.

## Objectives
1. Scrape match data from UEFA's public APIs
2. Analyze event distribution throughout matches (timing, frequency, patterns)
3. Calculate average statistics (goals, shots, fouls, cards, corners, etc.)
4. Store data in a structured format for game engine improvements
5. Identify realistic patterns for match simulation

---

## Data Sources Analysis

### 1. Match Statistics API
**Endpoint:** `https://matchstats.uefa.com/v2/team-statistics/{matchId}`

**Data Available:**
- Goals (scored, conceded)
- Attempts (total, on target, off target, blocked, saved)
- Shot accuracy percentages
- Fouls (committed, suffered)
- Disciplinary (yellow cards, red cards)
- Set pieces (corners, free kicks)
- Woodwork hits (post, bar)
- Assists
- Time played metrics
- Attempts conceded
- Clean sheet duration

**Usage:** Aggregate statistics for both teams per match

---

### 2. Match Info API
**Endpoint:** `https://match.uefa.com/v5/matches?matchId={matchId}`

**Data Available:**
- Team information (home/away, names, logos, country)
- Competition details (name, round, group, phase)
- Match metadata (date, time, stadium, attendance)
- Final score (regular time, total)
- Player events (scorers with timestamps)
- Referee information
- Match status and phase information
- Lineup availability
- Stadium details and capacity

**Usage:** Context for matches, scorer information, timing of goals

---

### 3. Live Events API
**Endpoint:** `https://editorial.uefa.com//api/liveblogs/{blogId}/posts?aggregator=lightliveblogjson&from={postId}&includeReactions=true&limit={limit}`

**Data Available:**
- Event-by-event timeline with precise timestamps
- Event types (goals, shots on goal, shots wide, shots blocked, saves, fouls, corners, cards)
- Player details for each event (name, position, image, team)
- Event phase (first half, second half)
- Minute and second precision timing
- Event translations and descriptions
- Sub-types (e.g., shot wide with POST subtype)

**Usage:** Detailed event distribution analysis, timing patterns, event sequences

---

## Phase 1: Data Collection Infrastructure

### 1.1 Setup Script Structure
**File:** `scripts/scrape-uefa-data.ts`

```typescript
// Core components:
- API client with rate limiting
- Match ID collection system
- Data fetching functions for each endpoint
- Error handling and retry logic
- Progress tracking
- Data validation
```

### 1.2 API Client Configuration
```typescript
interface APIConfig {
  baseUrls: {
    statistics: 'https://matchstats.uefa.com/v2',
    matchInfo: 'https://match.uefa.com/v5',
    events: 'https://editorial.uefa.com/api/liveblogs'
  },
  rateLimit: {
    requestsPerSecond: 2,
    retryAttempts: 3,
    retryDelay: 1000
  }
}
```

### 1.3 Data Models
**File:** `scripts/types/uefa-data.ts`

```typescript
interface MatchStatistics {
  matchId: string;
  homeTeam: TeamStatistics;
  awayTeam: TeamStatistics;
}

interface TeamStatistics {
  teamId: string;
  teamName: string;
  goals: number;
  attempts: number;
  attemptsOnTarget: number;
  attemptsOffTarget: number;
  attemptsBlocked: number;
  attemptsSaved: number;
  shotAccuracy: number;
  foulsCommitted: number;
  foulsSuffered: number;
  yellowCards: number;
  redCards: number;
  corners: number;
  woodworkHits: number;
  assists: number;
}

interface MatchEvent {
  eventId: string;
  matchId: string;
  eventType: EventType;
  eventSubType?: string;
  phase: 'FIRST_HALF' | 'SECOND_HALF';
  minute: number;
  second: number;
  totalSeconds: number;
  playerId?: string;
  playerName?: string;
  playerPosition?: string;
  teamId: string;
  targetPlayerId?: string;
  targetPlayerName?: string;
  description: string;
}

enum EventType {
  GOAL = 'GOAL',
  SHOT_ON_GOAL = 'SHOT_ON_GOAL',
  SHOT_WIDE = 'SHOT_WIDE',
  SHOT_BLOCKED = 'SHOT_BLOCKED',
  SAVE = 'SAVE',
  FOUL = 'FOUL',
  CORNER = 'CORNER',
  YELLOW_CARD = 'YELLOW_CARD',
  RED_CARD = 'RED_CARD',
  SUBSTITUTION = 'SUBSTITUTION'
}

interface MatchInfo {
  matchId: string;
  competition: string;
  round: string;
  phase: string;
  date: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  score: {
    home: number;
    away: number;
  };
  attendance: number;
  stadium: string;
  city: string;
}
```

---

## Phase 2: Data Collection Process

### 2.1 Match ID Collection
**Priority:** Get a diverse set of match IDs
- Multiple competitions (Champions League, qualifiers)
- Different rounds and phases
- Various team matchups
- Different score lines (close games, blowouts)

**Method:**
1. Start with known match IDs from sample data (2045691, 2035347)
2. Discover related matches through competition/round data
3. Target: 100-200 matches for statistically significant analysis

### 2.2 Data Fetching Strategy
```typescript
async function scrapeMatch(matchId: string): Promise<MatchData> {
  // 1. Fetch match info
  const matchInfo = await fetchMatchInfo(matchId);
  
  // 2. Fetch statistics
  const statistics = await fetchStatistics(matchId);
  
  // 3. Fetch events (if live blog available)
  const events = await fetchEvents(matchId, matchInfo.liveBlogId);
  
  // 4. Combine and validate
  return {
    matchId,
    matchInfo,
    statistics,
    events
  };
}
```

### 2.3 Data Storage Structure
**Directory:** `data/uefa-scrape/`
```
data/uefa-scrape/
├── raw/
│   ├── match-info/
│   │   ├── {matchId}.json
│   ├── statistics/
│   │   ├── {matchId}.json
│   └── events/
│       ├── {matchId}.json
├── processed/
│   ├── matches.json (all matches combined)
│   ├── statistics-summary.json
│   └── events-summary.json
└── analysis/
    ├── event-distributions.json
    ├── timing-patterns.json
    └── averages.json
```

---

## Phase 3: Data Analysis

### 3.1 Event Distribution Analysis

**Goal: Understand WHEN events happen**

```typescript
interface EventDistribution {
  eventType: EventType;
  byMinute: Record<string, number>; // minute -> count
  byPeriod: {
    firstHalf: {
      early: number;    // 0-7 minutes
      middle: number;   // 7-13 minutes
      late: number;     // 13-20 minutes
    };
    secondHalf: {
      early: number;    // 20-27 minutes
      middle: number;   // 27-33 minutes
      late: number;     // 33-40 minutes
    };
  };
  heatmap: number[][]; // 2D array: [minute][second] frequency
}
```

**Analysis Tasks:**
1. Goal timing patterns
   - When are most goals scored?
   - Late-game goal frequency
   - First vs second half distribution

2. Shot distribution
   - Shot frequency by minute
   - Shots on target vs off target timing
   - Shot clusters (high-pressure periods)

3. Foul patterns
   - Foul frequency over time
   - Card timing (when refs show cards)
   - Tactical fouls vs accidental

4. Set piece timing
   - Corner frequency
   - Free kick patterns

### 3.2 Statistical Averages

**Goal: Establish realistic baseline values**

```typescript
interface AverageStatistics {
  perMatch: {
    goals: { mean: number; median: number; stdDev: number; };
    shots: { mean: number; median: number; stdDev: number; };
    shotsOnTarget: { mean: number; median: number; stdDev: number; };
    shotAccuracy: { mean: number; median: number; stdDev: number; };
    fouls: { mean: number; median: number; stdDev: number; };
    yellowCards: { mean: number; median: number; stdDev: number; };
    redCards: { mean: number; median: number; stdDev: number; };
    corners: { mean: number; median: number; stdDev: number; };
    saves: { mean: number; median: number; stdDev: number; };
  };
  perTeam: {
    // Same structure as above but per team
  };
  correlations: {
    shotsToGoals: number;
    shotsOnTargetToGoals: number;
    foulsToCards: number;
    possessionToShots: number; // if possession data available
  };
}
```

**Analysis Tasks:**
1. Calculate means, medians, standard deviations
2. Identify outliers and remove if necessary
3. Compare winning teams vs losing teams
4. Home advantage analysis
5. Score line impact on statistics

### 3.3 Event Sequence Analysis

**Goal: Understand event chains and patterns**

```typescript
interface EventSequence {
  trigger: EventType;
  followingEvents: Array<{
    eventType: EventType;
    probability: number;
    avgTimeGap: number; // seconds
  }>;
}
```

**Examples to analyze:**
- Shot → Save → Corner sequence
- Foul → Free kick → Shot pattern
- Goal → Restart → Shot timing
- Card → Behavior change patterns

### 3.4 Player Position Analysis

**Goal: Understand which positions generate events**

```typescript
interface PositionEventStats {
  position: string; // "Avançado", "Defesa", "Guarda-redes"
  events: {
    goals: number;
    shots: number;
    assists: number;
    fouls: number;
    cards: number;
  };
}
```

---

## Phase 4: Integration with Game Engine

### 4.1 Match Engine Enhancements

**File:** `server/matchEngine.ts` or new `server/realisticMatchEngine.ts`

**Improvements based on data:**

1. **Event Timing System**
```typescript
class EventTimingEngine {
  private eventDistributions: Map<EventType, EventDistribution>;
  
  getNextEventTime(eventType: EventType, currentMinute: number): number {
    // Use distribution data to determine realistic timing
    // Weight by current minute and phase
  }
  
  shouldEventOccur(eventType: EventType, minute: number, gameState: GameState): boolean {
    // Probability-based on real data
  }
}
```

2. **Statistical Validation**
```typescript
class StatisticsValidator {
  validateMatchStats(matchStats: MatchStatistics): ValidationResult {
    // Compare against real averages
    // Flag unrealistic values
    // Adjust if needed
  }
}
```

3. **Event Generator**
```typescript
class RealisticEventGenerator {
  generateShot(minute: number, team: Team): ShotEvent {
    // Use real data for:
    // - Shot accuracy probabilities
    // - On target vs off target ratio
    // - Woodwork hit frequency
    // - Save probability
  }
  
  generateFoul(minute: number): FoulEvent {
    // Card probability based on timing and context
    // Position-based foul patterns
  }
}
```

### 4.2 Configuration Updates

**File:** `server/config/match-simulation.ts`

```typescript
export const REALISTIC_MATCH_CONFIG = {
  averages: {
    goalsPerMatch: 4.5,
    shotsPerTeam: 26.5,
    shotsOnTargetPerTeam: 12,
    foulsPerTeam: 8.5,
    yellowCardsPerTeam: 1,
    cornersPerTeam: 5.5,
    // ... loaded from analysis
  },
  
  eventProbabilities: {
    shotOnTargetToGoal: 0.25,
    shotToSave: 0.35,
    foulToYellow: 0.12,
    // ... from correlation analysis
  },
  
  timingDistributions: {
    // Load from analysis data
  }
};
```

---

## Phase 5: Validation and Testing

### 5.1 Data Quality Checks
- Verify API responses are complete
- Check for missing or null values
- Validate timestamp consistency
- Cross-reference event counts with statistics

### 5.2 Analysis Validation
- Compare derived statistics with known values
- Statistical significance tests
- Outlier detection and handling
- Cross-validation with multiple data subsets

### 5.3 Integration Testing
```typescript
describe('Realistic Match Engine', () => {
  it('should generate statistics within realistic ranges', () => {
    // Run 100 simulated matches
    // Compare averages to real data
    // Ensure within acceptable variance
  });
  
  it('should follow realistic event timing', () => {
    // Analyze event distribution
    // Compare to real patterns
  });
  
  it('should maintain proper event sequences', () => {
    // Check shot → save → corner patterns
    // Verify goal → restart behavior
  });
});
```

---

## Phase 6: Documentation and Insights

### 6.1 Generate Reports

**File:** `data/uefa-scrape/analysis/insights-report.md`

Include:
- Sample size and data quality metrics
- Key findings and patterns
- Surprising insights
- Recommendations for game engine
- Known limitations

### 6.2 Visualization (Optional)

Create charts/graphs for:
- Event distribution heatmaps
- Statistical box plots
- Timeline visualizations
- Correlation matrices

---

## Implementation Timeline

### Week 1: Data Collection
- [ ] Set up scraper infrastructure
- [ ] Implement API clients with rate limiting
- [ ] Create data models and types
- [ ] Scrape initial batch of 50 matches
- [ ] Validate data quality

### Week 2: Data Analysis
- [ ] Implement statistical analysis functions
- [ ] Generate event distributions
- [ ] Calculate averages and correlations
- [ ] Create event sequence mappings
- [ ] Generate insights report

### Week 3: Integration
- [ ] Design realistic match engine architecture
- [ ] Implement event timing system
- [ ] Add statistical validation
- [ ] Update configuration with real data
- [ ] Integration testing

### Week 4: Testing and Refinement
- [ ] Run validation tests
- [ ] Compare simulated vs real matches
- [ ] Fine-tune parameters
- [ ] Documentation
- [ ] Code review and optimization

---

## Technical Considerations

### Rate Limiting
- Max 2 requests per second to avoid overwhelming UEFA servers
- Implement exponential backoff for retries
- Cache responses to avoid re-fetching

### Error Handling
- Handle network failures gracefully
- Log missing data (e.g., some matches may not have live blogs)
- Continue processing even if some matches fail

### Data Privacy
- Only use publicly available APIs
- Don't distribute raw UEFA data
- Focus on aggregated statistics and insights

### Scalability
- Design for incremental updates
- Support adding new matches over time
- Version control for data schema changes

---

## Success Criteria

1. **Data Collection:** Successfully scrape 100+ matches with complete data
2. **Analysis Quality:** Generate statistically significant insights with confidence intervals
3. **Integration:** Match engine produces statistics within 10% of real averages
4. **Event Realism:** Event timing patterns match real distribution (Chi-square test)
5. **Performance:** Scraper completes 100 matches in < 10 minutes
6. **Documentation:** Complete report with actionable insights

---

## Future Enhancements

1. **Player-Specific Stats:** Individual player performance patterns
2. **Team Style Analysis:** Identify playing styles from statistics
3. **Competition Differences:** Compare different tournament levels
4. **Tactical Insights:** Formation impact on statistics
5. **Predictive Modeling:** Use historical data to predict match outcomes
6. **Real-time Integration:** Live match tracking and simulation comparison

---

## Files to Create

```
scripts/
├── scrape-uefa-data.ts          # Main scraper script
├── analyze-uefa-data.ts         # Analysis script
├── types/
│   └── uefa-data.ts             # Type definitions
└── utils/
    ├── api-client.ts            # API utilities
    ├── rate-limiter.ts          # Rate limiting
    └── data-validator.ts        # Validation utilities

data/uefa-scrape/
└── [Generated by scripts]

server/
├── config/
│   └── match-simulation.ts      # Updated config
└── realisticMatchEngine.ts      # Enhanced engine

tests/
└── realistic-match-engine.test.ts
```

---

## Next Steps

1. Review and approve this plan
2. Set up project structure
3. Begin Phase 1 implementation
4. Regular progress reviews after each phase

---

## Notes

- The Events API requires a `liveBlogId` which may not be available for all matches
- Some older matches may have incomplete data
- Focus on recent seasons (2022-2025) for most relevant patterns
- Consider UEFA Futsal Champions League as primary data source for consistency
