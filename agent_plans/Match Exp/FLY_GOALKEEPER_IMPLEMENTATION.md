# Fly-Goalkeeper Implementation

## Overview
The fly-goalkeeper tactical option allows teams to send their goalkeeper (or a designated advanced player) into the attacking play, creating a numerical advantage. This high-risk, high-reward strategy significantly impacts possession, attacking power, and defensive vulnerability.

## Configuration Options

### Usage Modes
Teams can configure fly-goalkeeper usage through 4 distinct modes:

1. **Never** - Fly-goalkeeper is never activated (default)
2. **Sometimes** - Activated randomly when:
   - Losing in the last 10 minutes (20% chance per tick)
   - Drawing in the last 3 minutes (15% chance per tick)
3. **EndGame** - Activated automatically when:
   - Last 5 minutes AND (losing OR drawing)
4. **Always** - Fly-goalkeeper active throughout the entire match

### Advanced Player Selection
- **Default**: Uses the goalkeeper as the advanced player
- **Custom**: Teams can designate a specific outfield player to act as the "advanced" player

## Tactical Modifiers

### Offensive Benefits
1. **Possession Boost**: +15% possession probability
   - Extra player in attack improves ball control
   - More passing options available

2. **Shot Frequency**: +25% shot generation probability
   - Numerical advantage creates more attacking opportunities
   - Additional player in final third

3. **Formation**: 5-0 formation multipliers
   - Offensive multiplier: 1.35x (highest in game)
   - Defensive multiplier: 0.50x (weakest in game)

### Defensive Vulnerabilities
1. **Defensive Weakness**: -40% defensive resistance
   - No goalkeeper to stop shots
   - Empty net is highly vulnerable

2. **Counter-Attack Vulnerability**: +50% opponent counter-attack goal probability
   - When opponent regains possession and counters
   - Goalkeeper is out of position/playing as outfielder
   - Creates devastating scoring opportunities for opponents

### Goal Context Tracking
Goals scored against fly-goalkeeper in counter-attacks are marked with:
- Special event description: "- GK out of position!"
- Goal context type: `"counter_vs_flyGK"`

## Schema Changes

### TacticsData Interface
```typescript
export interface TacticsData {
  // ... existing fields
  flyGoalkeeper?: {
    usage: FlyGoalkeeperUsage;
    advancedPlayerId?: number; // Optional: specific player to use
  };
}
```

### TacticalSetup Interface
```typescript
export interface TacticalSetup {
  // ... existing fields
  flyGoalkeeper?: {
    usage: FlyGoalkeeperUsage;
    advancedPlayerId?: number;
  };
}
```

### New Types
```typescript
export type FlyGoalkeeperUsage = "Never" | "Sometimes" | "EndGame" | "Always";
export type TacticsFormation = "4-0" | "3-1" | "2-2" | "5-0"; // Added 5-0
```

### MatchEvent Goal Context
Added `"counter_vs_flyGK"` to goalContext union type for tracking goals scored against fly-goalkeeper.

## Match Engine Implementation

### Activation Logic (`isFlyGoalkeeperActive`)
Checks if fly-goalkeeper should be active based on:
- Team's configured usage mode
- Current match minute
- Score differential
- Randomness (for "Sometimes" mode)

### Possession Modification (`updatePossession`)
- Applies +15% possession boost when fly-goalkeeper is active
- Adjusts possession probability calculation
- Helps attacking team maintain ball control

### Tactical Modifiers (`getTacticalModifiers`)
- Applies +25% shot frequency modifier
- Applies -40% defensive resistance penalty
- Integrated into existing tactical system

### Shot Generation (`generateShotEvent`)
- Detects counter-attacks against fly-goalkeeper
- Applies +50% goal probability multiplier
- Adds special event descriptions for fly-GK goals
- Tracks with unique goal context

## Usage Examples

### Scenario 1: Desperate Late Push
```typescript
tactics: {
  mentality: 'VeryAttacking',
  pressingIntensity: 'VeryHigh',
  width: 'Wide',
  flyGoalkeeper: {
    usage: 'EndGame', // Activate in last 5 minutes when losing/drawing
    advancedPlayerId: undefined // Use goalkeeper
  }
}
```

### Scenario 2: Experimental High-Risk Strategy
```typescript
tactics: {
  mentality: 'VeryAttacking',
  pressingIntensity: 'Medium',
  width: 'Balanced',
  flyGoalkeeper: {
    usage: 'Sometimes', // Random activation when behind late
    advancedPlayerId: 42 // Use skilled outfield player as advanced GK
  }
}
```

### Scenario 3: Extreme Attacking (Beach Futsal Style)
```typescript
tactics: {
  mentality: 'VeryAttacking',
  pressingIntensity: 'High',
  width: 'Wide',
  flyGoalkeeper: {
    usage: 'Always', // Full-time fly-goalkeeper
    advancedPlayerId: undefined
  }
}
```

## Strategic Considerations

### When to Use
- **Trailing late in the match**: Need goals desperately
- **Cup finals**: All-or-nothing situations
- **Against weaker opponents**: Risk is more manageable
- **Strong attacking team**: Can capitalize on numerical advantage

### Risks
- **Counter-attack goals**: 50% higher conversion rate
- **Defensive collapse**: -40% resistance means more shots faced
- **Momentum swings**: Conceding on counter can be devastating
- **Energy drain**: High pressing + fly-GK = exhausted players

### Synergies
- **VeryAttacking mentality**: Maximize offensive benefits
- **VeryHigh pressing**: Win ball back quickly to prevent counters
- **High fatigue modifiers**: Ensure awareness of energy costs
- **Wide width**: Utilize extra player across the pitch

## Statistical Impact

Expected outcomes when fly-goalkeeper is active:
- **Possession**: +15% (from ~50% to ~57.5%)
- **Shots**: +25% increase in shot frequency
- **Goals scored**: Higher due to more shots + better quality
- **Goals conceded**: Significantly higher on counter-attacks
- **Counter-attack goals**: +50% conversion rate

## Future Enhancements

Potential additions:
1. **Player-specific effects**: Some players better at fly-GK role
2. **Fatigue impact**: Extra running for goalkeeper/advanced player
3. **Tactical awareness trait**: Better decision-making for when to advance
4. **UI indicators**: Visual cue when fly-goalkeeper is active
5. **Statistics tracking**: Track fly-GK activation time and effectiveness
6. **AI decision-making**: AI teams use fly-GK strategically

## Testing Recommendations

Test scenarios:
1. **EndGame mode**: Verify activates only in last 5 minutes when trailing/drawing
2. **Sometimes mode**: Check random activation occurs appropriately
3. **Counter vulnerability**: Confirm +50% goal probability on counters
4. **Possession boost**: Validate +15% possession increase
5. **Shot frequency**: Confirm +25% more shots generated
6. **Event descriptions**: Verify special text for fly-GK counter goals

## Code Locations

- **Schema types**: `shared/schema.ts` (lines 7, 10-24, 76-86)
- **Tactical modifiers**: `server/matchEngine.ts` (lines 29-60)
- **Activation logic**: `server/matchEngine.ts` (lines 392-429)
- **Possession effects**: `server/matchEngine.ts` (lines 431-453)
- **Shot generation**: `server/matchEngine.ts` (lines 683-690, 751-761)
- **Tactical modifiers method**: `server/matchEngine.ts` (lines 539-579)
