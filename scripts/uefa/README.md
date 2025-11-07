# UEFA Futsal Data Scraper

Scripts for collecting and analyzing UEFA Futsal Champions League match data to improve the game's match simulation realism.

## 📁 Structure

```
scripts/uefa/
├── types.ts                    # TypeScript type definitions
├── config.ts                   # Configuration and constants
├── analyze-fixtures.ts         # Analyze existing Fixtures.json (Phase 1)
├── scrape-statistics.ts        # Scrape match statistics (Phase 2)
├── analyze-all-data.ts         # Comprehensive analysis (Phase 3)
└── utils/
    ├── rate-limiter.ts         # Rate limiting and retry logic
    └── logger.ts               # Logging and progress tracking
```

## 🚀 Quick Start

### Phase 1: Analyze Existing Data (Start Here!)

You already have `Fixtures.json` with comprehensive match data. Analyze it first:

```bash
npm run uefa:analyze
```

This will:
- ✅ Load all fixtures from `Fixtures.json`
- ✅ Extract match IDs for finished matches
- ✅ Analyze goal timing patterns
- ✅ Calculate score distributions
- ✅ Generate insights report
- ✅ Save results to `data/uefa-scrape/analysis/`

**No API calls needed!** Pure data analysis.

### Phase 2: Scrape Statistics (Coming Soon)

After analyzing fixtures, scrape detailed statistics:

```bash
npm run uefa:scrape-stats
```

This will:
- 📊 Use match IDs from Phase 1
- 🌐 Fetch statistics from UEFA API
- 💾 Save to `data/uefa-scrape/processed/`
- ⏱️ Rate limited (2 requests/second)

### Phase 3: Comprehensive Analysis (Coming Soon)

Combine fixtures + statistics for full analysis:

```bash
npm run uefa:analyze-all
```

## 📊 What Data You'll Get

### From Fixtures.json (Already Available!)
- ✅ Match IDs and basic info
- ✅ Goal timing (exact minute:second)
- ✅ Scores and results
- ✅ Player events
- ✅ Team and competition data

### From Statistics API (Phase 2)
- 📈 Shot statistics (attempts, accuracy, on/off target)
- 🛡️ Defensive stats (fouls, cards, saves)
- 🎯 Set pieces (corners, free kicks)
- 📊 Advanced metrics (assists, clean sheets)

## 🎯 Output Files

### Phase 1 Output
```
data/uefa-scrape/analysis/
├── fixtures-analysis.json      # Complete analysis results
├── goal-timing-data.json       # Detailed timing for each goal
└── match-ids.json              # Categorized match ID lists
```

### Phase 2 Output (Coming Soon)
```
data/uefa-scrape/processed/
├── all-statistics.json         # Statistics for all matches
└── matches-combined.json       # Fixtures + Statistics merged
```

## 📈 Sample Analysis Output

After running `npm run uefa:analyze`, you'll see:

```
📊 OVERVIEW
Total Matches:        450
Finished Matches:     280
With Lineups:         265
With Goal Data:       278

⚽ GOAL ANALYSIS
Total Goals:          1,240
Avg Goals/Match:      4.43

Goals by Phase:
  First Half:         520 (41.9%)
  Second Half:        720 (58.1%)

Goals by Position:
  FORWARD:           856 (69.0%)
  DEFENDER:          312 (25.2%)
  GOALKEEPER:        72 (5.8%)

⏱️ TIMING PATTERNS
Early (0-10 min):     180
Mid-game (10-30):     640
Late (30-40):         420
Last Minute (38-40):  95
```

## 🛠️ Technical Details

### Rate Limiting
- Max 2 requests/second to UEFA servers
- Automatic exponential backoff on errors
- 3 retry attempts with delays

### Error Handling
- Graceful handling of missing data
- Skips 404s (unavailable matches)
- Logs all errors for review
- Continues processing on failures

### Data Validation
- Checks for complete match data
- Validates score ranges
- Identifies outliers
- Quality metrics included

## 🎮 Integration with Game Engine

The analysis results will be used to update:

1. **Match Engine** (`server/matchEngine.ts`)
   - Realistic event timing
   - Accurate shot-to-goal ratios
   - Proper foul/card frequencies

2. **Configuration** (`server/config/match-simulation.ts`)
   - Average statistics per match
   - Event probability distributions
   - Timing patterns

3. **Validation** (Tests)
   - Ensure simulated matches match real patterns
   - Statistical significance tests

## 📝 Example Usage

### Analyze Fixtures
```typescript
import { analyzeFixtures, loadFixtures } from './scripts/uefa/analyze-fixtures';

const fixtures = loadFixtures();
const analysis = analyzeFixtures(fixtures);

console.log(`Average goals per match: ${analysis.goalAnalysis.averageGoalsPerMatch}`);
console.log(`Finished matches: ${analysis.overview.finishedMatches}`);
```

### Access Analysis Results
```typescript
import * as fs from 'fs';

const analysis = JSON.parse(
  fs.readFileSync('data/uefa-scrape/analysis/fixtures-analysis.json', 'utf-8')
);

// Get match IDs for scraping
const matchIds = analysis.matchIds.withCompleteData;

// Get goal timing patterns
const goalsByMinute = analysis.goalAnalysis.goalsByMinute;
```

## 🔍 Data Sources

### 1. Fixtures API (Already Have Data!)
```
https://match.uefa.com/v5/matches
```
- Match schedules and results
- Basic team info
- Goal events with timing

### 2. Statistics API (To Be Scraped)
```
https://matchstats.uefa.com/v2/team-statistics/{matchId}
```
- Detailed shot statistics
- Fouls and cards
- Corners and set pieces

### 3. Events API (Optional)
```
https://editorial.uefa.com/api/liveblogs/{blogId}/posts
```
- Minute-by-minute events
- Requires blog ID discovery

## ⚠️ Important Notes

1. **Start with Phase 1** - Analyze existing data before scraping
2. **Respect rate limits** - Don't overwhelm UEFA servers
3. **Check data quality** - Review analysis before using in game
4. **Incremental approach** - Start with 50 matches, scale up

## 🎯 Success Criteria

- ✅ Successfully analyze 200+ finished matches
- ✅ Extract goal timing for 95%+ of matches
- ✅ Calculate statistically significant averages
- ✅ Identify realistic event patterns
- ✅ Generate actionable insights for game engine

## 🐛 Troubleshooting

### "Cannot find Fixtures.json"
Ensure the file exists at:
```
agent_plans/Match Exp/Scrape UEFA/Fixtures.json
```

### "Analysis shows 0 matches"
Check that Fixtures.json contains valid match data:
```bash
head -100 "agent_plans/Match Exp/Scrape UEFA/Fixtures.json"
```

### Rate limit errors
The scraper will automatically retry with exponential backoff.
If persistent, increase delays in `config.ts`.

## 📚 Next Steps

1. ✅ Run `npm run uefa:analyze` to analyze existing data
2. 📊 Review analysis results in `data/uefa-scrape/analysis/`
3. 🔍 Identify patterns and insights
4. 🚀 Build statistics scraper (Phase 2)
5. 🎮 Integrate findings into match engine

## 📖 Documentation

- See `IMPLEMENTATION_PLAN.md` for full 6-phase plan
- See `API_REFERENCE.md` for API documentation
- See `QUICK_START.md` for quick overview

## 💡 Tips

- **Start small**: Analyze what you have before scraping more
- **Validate early**: Check analysis results before scaling
- **Document findings**: Note interesting patterns
- **Test integration**: Try values in game engine incrementally

---

**Status**: Phase 1 Implementation Complete ✅

Next: Run `npm run uefa:analyze` to see your data insights!
