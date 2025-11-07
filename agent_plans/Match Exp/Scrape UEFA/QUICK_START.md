# UEFA Futsal Data Scraping - Quick Summary

## What You Have

### 1. ✅ Fixtures.json (117,454 lines)
**This is GOLD!** You already have comprehensive fixture data from the API endpoint:
```
https://match.uefa.com/v5/matches?competitionId=27&fromDate=2025-08-01&limit=50&offset=0&order=ASC&phase=ALL&seasonYear=2026&toDate=2025-08-31&utcOffset=1
```

**Contains:**
- Hundreds of matches from multiple seasons
- Match IDs for all games
- Basic match info (teams, scores, dates)
- Player events (goals with timing)
- Stadium and attendance data
- Referee information

### 2. ✅ Sample Data Files
- `MatchInfo.json` - Detailed single match data
- `Statistics.json` - Team statistics example  
- `Events.json` - Live events timeline (10 events)

### 3. ✅ Implementation Plan (IMPLEMENTATION_PLAN.md)
- Complete 6-phase plan
- Data models and structure
- Analysis methodology
- Integration strategy

### 4. ✅ API Reference (API_REFERENCE.md)
- All API endpoints documented
- Query parameters explained
- Code examples
- Best practices

---

## What You DON'T Need to Scrape

❌ **Fixtures/Match List** - You already have this in `Fixtures.json`!

Just extract the match IDs from your existing data:
```typescript
const matchIds = fixtures
  .filter(m => m.status === 'FINISHED')
  .map(m => m.id);
```

---

## What You NEED to Scrape

### ✅ Match Statistics (for each match)

**Endpoint:** `https://matchstats.uefa.com/v2/team-statistics/{matchId}`

**Why:** 
- Detailed statistics not in fixtures data
- Shot accuracy, fouls, cards, corners
- Save percentages, assists
- Complete metrics for analysis

**From your Fixtures.json, you can find:**
- ~200+ finished matches to analyze
- Match IDs ready to use

### ⚠️ Live Events (Optional - if blog IDs are available)

**Endpoint:** `https://editorial.uefa.com/api/liveblogs/{blogId}/posts`

**Why:**
- Minute-by-minute event timing
- Shot sequences and patterns
- Detailed event distribution

**Challenge:** Need to find `blogId` for each match (not in fixtures data)

---

## Recommended Approach

### Phase 1: Leverage Existing Data (Start Here!)

```typescript
// 1. Load your Fixtures.json
const fixtures = require('./Fixtures.json');

// 2. Filter for complete matches
const completeMatches = fixtures.filter(match => 
  match.status === 'FINISHED' &&
  match.score?.total &&
  (match.lineupStatus === 'AVAILABLE' || 
   match.lineupStatus === 'TACTICAL_AVAILABLE')
);

// 3. Extract match IDs
const matchIds = completeMatches.map(m => m.id);
console.log(`${matchIds.length} matches ready to analyze`);

// 4. Already have goal timing from fixtures!
completeMatches.forEach(match => {
  if (match.playerEvents?.scorers) {
    match.playerEvents.scorers.forEach(goal => {
      console.log(`Goal at ${goal.time.minute}:${goal.time.second}`);
    });
  }
});
```

### Phase 2: Fetch Statistics

```typescript
// For each match ID, fetch detailed statistics
const statistics = [];

for (const matchId of matchIds) {
  try {
    const stats = await fetch(
      `https://matchstats.uefa.com/v2/team-statistics/${matchId}`
    ).then(r => r.json());
    
    statistics.push({
      matchId,
      stats
    });
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.error(`Failed to fetch stats for match ${matchId}`);
  }
}

// Save to file
fs.writeFileSync(
  'all-statistics.json', 
  JSON.stringify(statistics, null, 2)
);
```

### Phase 3: Analyze

```typescript
// Calculate averages from all matches
const averages = calculateAverages(statistics);

// Analyze goal timing from fixtures
const goalDistribution = analyzeGoalTiming(completeMatches);

// Analyze shot patterns from statistics
const shotPatterns = analyzeShotPatterns(statistics);

// Generate insights report
generateReport({
  averages,
  goalDistribution,
  shotPatterns
});
```

---

## What You Can Already Analyze from Fixtures.json

### 1. ✅ Goal Timing Distribution
From `playerEvents.scorers` you have:
- Exact minute and second of each goal
- Which half (FIRST_HALF, SECOND_HALF)
- Player and position who scored

**Analysis possible:**
- Goals per minute distribution
- First half vs second half goals
- Late game goal frequency
- Position-based goal patterns

### 2. ✅ Match Scores
From `score.total`:
- Home team goals
- Away team goals
- High-scoring vs low-scoring games

**Analysis possible:**
- Average goals per match
- Score line distributions
- Home advantage analysis

### 3. ✅ Match Context
From match metadata:
- Competition phase (QUALIFYING, TOURNAMENT)
- Round information
- Team strength differences
- Attendance numbers

---

## Data You Get from Statistics API

### Shot Statistics
- Total attempts
- Shots on target
- Shots off target  
- Shots blocked
- Shot accuracy %
- Woodwork hits

### Defensive Statistics
- Fouls committed
- Fouls suffered
- Yellow cards
- Red cards
- Saves

### Set Pieces
- Corners
- Free kicks

### Advanced
- Assists
- Clean sheet duration
- Time played metrics

---

## Quick Win: Use Existing Data First!

**Before scraping anything new, analyze what you have:**

```typescript
// Count matches by season
const bySeason = fixtures.reduce((acc, match) => {
  acc[match.seasonYear] = (acc[match.seasonYear] || 0) + 1;
  return acc;
}, {});

console.log('Matches by season:', bySeason);

// Count finished matches
const finished = fixtures.filter(m => m.status === 'FINISHED').length;
console.log(`Finished matches: ${finished}`);

// Analyze goal timing from existing data
const goalsByMinute = {};
fixtures.forEach(match => {
  match.playerEvents?.scorers?.forEach(goal => {
    const minute = goal.time.minute;
    goalsByMinute[minute] = (goalsByMinute[minute] || 0) + 1;
  });
});

console.log('Goals by minute:', goalsByMinute);
```

---

## Implementation Priority

### ✅ Priority 1: Analyze Fixtures.json
- Extract match IDs
- Analyze goal timing
- Calculate score distributions
- NO API CALLS NEEDED!

### ✅ Priority 2: Fetch Statistics
- Use match IDs from fixtures
- Scrape statistics API
- Save to `all-statistics.json`
- ~500ms delay between requests

### ⚠️ Priority 3: Events API (Optional)
- Only if you can find blog IDs
- Very detailed event timing
- Nice to have, not essential

### ✅ Priority 4: Analysis
- Combine fixtures + statistics
- Calculate averages and distributions
- Generate insights report
- Update game engine

---

## Estimated Timeline

### Week 1: Use What You Have
- ✅ Day 1-2: Analyze Fixtures.json (NO scraping needed!)
- ✅ Day 3-4: Build statistics scraper
- ✅ Day 5-7: Scrape statistics for all matches

### Week 2: Analysis & Integration  
- ✅ Day 1-3: Analyze combined data
- ✅ Day 4-5: Generate insights report
- ✅ Day 6-7: Update game engine configs

---

## Files to Create

### Immediate (Use existing data)
```
scripts/
  analyze-fixtures.ts         # Analyze Fixtures.json
  extract-match-ids.ts        # Get match IDs from fixtures
```

### Short-term (Scrape statistics)
```
scripts/
  scrape-statistics.ts        # Fetch stats for all matches
  types/uefa-stats.ts         # Type definitions
  utils/rate-limiter.ts       # Rate limiting utility
```

### Analysis
```
scripts/
  analyze-all-data.ts         # Combine fixtures + stats
  generate-report.ts          # Create insights report
```

---

## Key Insights from Your Data

Looking at your sample match from Fixtures.json:

**Match ID:** 2045610 (Hjørring vs Maccabi Netanya)
- **Score:** 5-1 (Home win)
- **Goals:** 6 goals total (above average suggests ~4-5 per match)
- **Goal Timing:** 
  - 4:16 (early first half)
  - 22:32, 27:52, 33:19, 38:12 (second half cluster)
  - 39:54 (very late)
- **Attendance:** 50 (small crowd)

**Pattern observed:** Most goals in second half, especially late game!

---

## Next Steps - Your Choice!

### Option A: Quick Analysis (Recommended)
1. Write script to analyze Fixtures.json
2. Extract goal timing patterns
3. Calculate score averages
4. Generate initial insights
5. **NO API SCRAPING NEEDED YET!**

### Option B: Full Scraping
1. Extract match IDs from Fixtures.json
2. Scrape statistics for all matches
3. Combine all data
4. Full analysis

### Option C: Incremental
1. Analyze Fixtures.json first (Option A)
2. Then scrape statistics for sample (50 matches)
3. Validate findings
4. Scale up if needed

---

## Questions to Consider

1. **How many matches in Fixtures.json are finished?**
   - Run analysis script to count

2. **What seasons are included?**
   - Check `seasonYear` field distribution

3. **Do you need all matches or a sample?**
   - 100-200 matches is statistically significant

4. **Statistics API or fixtures only?**
   - Fixtures: Basic analysis possible now
   - Statistics: Comprehensive analysis (requires scraping)

---

## Bottom Line

🎉 **You're 50% there already!**

Your `Fixtures.json` contains:
- ✅ Match IDs (hundreds of them)
- ✅ Goal timing (exact minute/second)
- ✅ Scores and results
- ✅ Team and competition info

Just need:
- 📊 Statistics API data (shots, fouls, cards, etc.)
- 🔬 Analysis code
- 🎮 Game engine integration

**Start by analyzing what you have, then decide if you need more!**
