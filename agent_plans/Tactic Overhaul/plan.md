# Tactics Dashboard Overhaul - Implementation Plan

## 📋 Overview

Create an interactive, visually stunning tactics dashboard that allows managers to:
- Set team formation (3-1, 2-2, 1-2-1, 4-0, 1-3)
- Assign players to field positions via drag-and-drop or click-to-assign
- View a vertical futsal field with positioned player markers
- Select substitutes for the bench
- Save and load tactical setups

**Design Philosophy**: Clean, modern, mobile-first with a vertical futsal field layout inspired by real futsal pitch visualization tools.

---

## 🎨 Visual Design

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│  Header                                         │
│  [Formation ▼] [Instructions] [Reset] [Save]    │
├─────────────────────┬───────────────────────────┤
│                     │                           │
│   Futsal Field      │    Player Pool            │
│   (Portrait)        │    ┌─────────────┐        │
│                     │    │ Player 1    │        │
│       ●             │    │ DEF • 16/20 │        │
│                     │    └─────────────┘        │
│    ●     ●          │    ┌─────────────┐        │
│                     │    │ Player 2    │        │
│       ●             │    │ MID • 14/20 │        │
│                     │    └─────────────┘        │
│       ●             │    ...                    │
│   [Goalkeeper]      │                           │
│                     │                           │
├─────────────────────┤                           │
│  Substitutes Bench  │                           │
│  [#] [#] [ ] [ ] [ ]│                           │
└─────────────────────┴───────────────────────────┘
```

### Field Design

- **Aspect Ratio**: 2:3 (portrait orientation)
- **Max Width**: 420px (scales down on mobile)
- **Border**: 3px white border with 35% opacity, rounded corners (3xl)
- **Background**: SVG field image with grass texture
- **Shadow**: Heavy drop shadow for depth

### Player Markers

**Style**:
- Circular avatar (40px on mobile, 48px on desktop)
- Split gradient background:
  - **Goalkeeper**: Green (#15803d) top + Light green (#BBF7D0) bottom
  - **Outfield**: Green (#22c55e) top + White (#ffffff) bottom
- Border: 3px matching bottom gradient color
- Drop shadow for elevation

**Label**:
- Dark pill below marker (bg-slate-950/85)
- White text, 12px font
- Shows player surname or role name if empty

### Position Slots (Drop Zones)

- Dashed circle (28px diameter)
- White border when dragging
- Subtle white background (20% opacity) on hover
- Positioned absolutely using percentage coordinates

---

## 🏗️ Technical Architecture

### Component Hierarchy

```
TacticsPage
├── TacticsHeader
│   ├── FormationSelector (Select dropdown)
│   ├── InstructionsButton (Opens dialog)
│   ├── ResetButton
│   └── SaveButton
│
├── FormationCard
│   └── FormationSelect (no description text)
│
├── TacticalInstructionsDialog (TBI - To Be Implemented)
│   ├── DialogHeader (title, close button)
│   └── DialogContent
│       ├── Mentality Slider (Defensive / Balanced / Attacking)
│       ├── Width Slider (Narrow / Standard / Wide)
│       ├── Tempo Slider (Slow / Normal / Fast)
│       ├── Pressing Intensity
│       └── SaveButton
│
├── TacticsFieldCard
│   └── FutsalField
│       ├── FieldBackground (SVG)
│       ├── PositionSlot[] (drop zones + players)
│       │   └── PlayerMarker (draggable circle)
│       └── FormationOverlay
│
├── SubstitutesBenchCard
│   ├── SubstitutesBenchHeader (title + description)
│   └── SubstitutesGrid
│       └── SubstituteSlot[] (5 slots with drop zones)
│
└── PlayerPoolCard
    ├── PlayerPoolHeader (title + count)
    └── PlayerPoolGrid
        └── PlayerPoolCard[] (draggable cards)
```

### State Management

```typescript
interface TacticsState {
  formation: Formation; // "4-0" | "3-1" | "2-2"
  assignments: Record<string, Player | null>; // slotId -> player (field positions)
  substitutes: (Player | null)[]; // Array of 5 substitute slots
  selectedPlayer: Player | null; // For click-to-assign mode
  instructions: TacticalInstructions; // Advanced tactical settings (TBI)
}

// To Be Implemented in future phase
interface TacticalInstructions {
  mentality: "defensive" | "balanced" | "attacking";
  width: "narrow" | "standard" | "wide";
  tempo: "slow" | "normal" | "fast";
  pressingIntensity: number; // 1-10
}
```

### Formation System

```typescript
type Formation = "4-0" | "3-1" | "2-2";

interface PositionSlot {
  id: string; // "gk", "fixo", "ala-left", "pivot", etc.
  role: string; // Display name
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
}

interface FormationLayout {
  id: Formation;
  name: string;
  positions: PositionSlot[];
}
```

**Available Formations**:

1. **4-0**: GK + 4 Fixo/Ala/Pivot (ultra defensive, parking the bus)
2. **3-1**: GK + 1 Fixo + 2 Ala + 1 Pivot (defensive with pivot up front)
3. **2-2**: GK + 2 Fixo + 2 Ala/Pivot (balanced, most common)

---

## 🛠️ Implementation Steps

### Phase 1: Core Components (4 hours)

#### 1.1 Create Formation Definitions

**File**: `client/src/lib/formations.ts`

```typescript
export type Formation = "4-0" | "3-1" | "2-2";

export type PositionRole = 
  | "Goalkeeper"
  | "Fixo" 
  | "Ala" 
  | "Pivot";

export interface PositionSlot {
  id: string;
  role: PositionRole;
  x: number;
  y: number;
}

export interface FormationLayout {
  id: Formation;
  name: string;
  positions: PositionSlot[];
}

export const FORMATIONS: Record<Formation, FormationLayout> = {
  "4-0": {
    id: "4-0",
    name: "4-0",
    positions: [
      { id: "gk", role: "Goalkeeper", x: 50, y: 88 },
      { id: "def-1", role: "Fixo", x: 20, y: 55 },
      { id: "def-2", role: "Ala", x: 40, y: 45 },
      { id: "def-3", role: "Pivot", x: 60, y: 45 },
      { id: "def-4", role: "Ala", x: 80, y: 55 },
    ]
  },
  "3-1": {
    id: "3-1",
    name: "3-1",
    positions: [
      { id: "gk", role: "Goalkeeper", x: 50, y: 88 },
      { id: "fixo", role: "Fixo", x: 50, y: 67 },
      { id: "ala-left", role: "Ala", x: 20, y: 55 },
      { id: "ala-right", role: "Ala", x: 80, y: 55 },
      { id: "pivot", role: "Pivot", x: 50, y: 25 },
    ]
  },
  "2-2": {
    id: "2-2",
    name: "2-2",
    positions: [
      { id: "gk", role: "Goalkeeper", x: 50, y: 88 },
      { id: "fixo-left", role: "Fixo", x: 25, y: 65 },
      { id: "fixo-right", role: "Fixo", x: 75, y: 65 },
      { id: "ala-left", role: "Ala", x: 30, y: 35 },
      { id: "pivot", role: "Pivot", x: 70, y: 35 },
    ]
  },
};
```

#### 1.2 Create Futsal Field Background

**File**: `client/public/fields/futsal-field.svg`

SVG file with:
- Green gradient background
- White field markings (center line, circles, goal areas)
- Grass texture pattern (optional)

#### 1.3 Create Player Marker Component

**File**: `client/src/components/tactics/PlayerMarker.tsx`

Features:
- Draggable using react-dnd
- Shows player jersey number or empty state
- Gradient background (goalkeeper vs outfield)
- Label below with player name or role
- Touch-friendly (works on mobile)

#### 1.4 Create Position Slot Component

**File**: `client/src/components/tactics/PositionSlot.tsx`

Features:
- Drop zone for players
- Dashed circle indicator
- Highlights on drag-over
- Manages player assignment
- Absolute positioning based on formation coordinates

#### 1.5 Create Futsal Field Component

**File**: `client/src/components/tactics/FutsalField.tsx`

Features:
- Vertical aspect ratio (2:3)
- Background SVG field
- Maps formation positions to slots
- Handles player drops
- Responsive (max 420px width)

### Phase 2: Player Management (3 hours)

#### 2.1 Create Player Pool Card

**File**: `client/src/components/tactics/PlayerPoolCard.tsx`

Features:
- Draggable player card
- Shows jersey number, name, position, rating
- Disabled state when assigned (shows "✓ Field" or "✓ Sub" badge)
- Clickable for mobile (click-to-assign mode)
- Visual feedback on selection

#### 2.2 Create Player Pool Container

**File**: `client/src/components/tactics/PlayerPool.tsx`

Features:
- Scrollable list of available players
- Filters out assigned players (or shows them as disabled)
- Search/filter by name or position (future)
- Count of available players

#### 2.3 Create Substitutes Bench

**File**: `client/src/components/tactics/SubstitutesBench.tsx`

Features:
- 5 fixed substitute slots displayed horizontally
- Each slot is a drop zone for players
- Shows player avatar and surname when filled
- Empty state with "+" icon
- Draggable players can be removed
- Visual feedback on hover (border color changes)
- Mobile-friendly click-to-assign mode

### Phase 3: Main Page & Logic (3 hours)

#### 3.1 Create Tactics Page

**File**: `client/src/pages/TacticsPage.tsx`

Features:
- DndProvider wrapper (HTML5Backend for desktop, TouchBackend for mobile)
- Formation selector dropdown (no descriptions, just formation names)
- **Instructions button** next to formation selector (opens dialog - TBI)
- Field and player pool layout
- Assignment logic (drag-and-drop + click-to-assign)
- Reset and save buttons
- Validation (all 5 positions filled)

Layout:
```tsx
<div className="flex items-center gap-2">
  <Select value={formation} onValueChange={handleFormationChange}>
    <SelectTrigger className="w-32">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="4-0">4-0</SelectItem>
      <SelectItem value="3-1">3-1</SelectItem>
      <SelectItem value="2-2">2-2</SelectItem>
    </SelectContent>
  </Select>
  
  <Button variant="outline" onClick={() => setShowInstructions(true)}>
    <Settings className="w-4 h-4 mr-2" />
    Instructions
  </Button>
</div>
```

#### 3.2 Implement State Management

Custom hook: `useTacticsState()`

Functions:
- `assignToSlot(slotId, player)` - Assign player to field position
- `assignToSubstitute(index, player)` - Assign player to substitute slot
- `removePlayer(playerId)` - Remove player from field or bench
- `changeFormation(formation)` - Switch formation, preserve GK
- `resetAssignments()` - Clear all assignments (field + subs)
- `saveTactics()` - Send to backend API

Assignment Logic:
- Player can only be in ONE place at a time (field OR bench, not both)
- Assigning a player removes them from their previous location
- Player pool shows all players with disabled state for assigned ones
- Badge indicator shows if player is on field or bench

#### 3.3 Implement Dual Interaction Mode

Support both:
1. **Drag-and-Drop** (desktop): Native react-dnd behavior
2. **Click-to-Assign** (mobile): Click player → click slot

### Phase 4: Backend Integration (2 hours)

#### 4.1 Update Database Schema

Add to `playerTeam` table:

```typescript
tactics: {
  formation: Formation;
  startingLineup: Record<string, number>; // slotId -> playerId
  substitutes: number[]; // Array of 5 player IDs
}
```

#### 4.2 Create API Endpoints

**GET** `/api/tactics` - Load current tactics
**POST** `/api/tactics/save` - Save tactics

#### 4.3 Update Match Engine

Use saved tactics when simulating matches:
- Starting lineup based on assignments
- Formation affects match simulation
- Substitutes available during match

### Phase 5: Polish & UX (2 hours)

#### 5.1 Add Visual Enhancements

- Smooth transitions on formation change
- Pulse animation on drop zones
- Scale effect on drag
- Skeleton loaders while fetching data

#### 5.2 Add Validation & Feedback

- Toast notifications on assign/remove
- Error message if positions not filled
- Warning if player in wrong position
- Confirmation dialog on formation change (if players need removal)

#### 5.3 Add Accessibility

- Keyboard navigation (Tab, Enter, Escape)
- Screen reader labels
- Focus indicators
- ARIA attributes on draggable elements

#### 5.4 Mobile Optimization

- Touch-friendly targets (min 44px)
- Swipe to remove player
- Larger tap areas on small screens
- Prevent scroll interference during drag

### Phase 6: Tactical Instructions Dialog (TBI - To Be Implemented Later)

**File**: `client/src/components/tactics/TacticalInstructionsDialog.tsx`

Features:
- Modal/Dialog component (using shadcn/ui Dialog)
- Opens when "Instructions" button is clicked
- **Mentality Slider**: Defensive / Balanced / Attacking
- **Width Control**: Narrow / Standard / Wide
- **Tempo Control**: Slow / Normal / Fast
- **Pressing Intensity**: Slider 1-10
- Save button to apply instructions
- Cancel button to discard changes

**Note**: This is a placeholder for future implementation. The button will be visible but the dialog functionality will be implemented in a later phase.

### Phase 7: Testing & Documentation (1 hour)

- Test all 3 formations (4-0, 3-1, 2-2)
- Test drag-and-drop on desktop
- Test click-to-assign on mobile/tablet
- Test validation rules
- Test save/load functionality
- Verify Instructions button is present (even if TBI)
- Update README with tactics documentation

---

## 📦 Dependencies

### New Packages Required

```bash
npm install react-dnd react-dnd-html5-backend react-dnd-touch-backend
```

**react-dnd**: Drag-and-drop library for React
**react-dnd-html5-backend**: Desktop drag-and-drop support
**react-dnd-touch-backend**: Mobile touch drag-and-drop support

---

## 🎯 Key Features Summary

✅ **3 Formations**: 4-0, 3-1, 2-2 (clean dropdown, no descriptions)
✅ **Instructions Button**: Opens advanced tactical settings dialog (TBI)
✅ **Vertical Field**: Portrait orientation, realistic proportions  
✅ **Drag-and-Drop**: Desktop support with visual feedback  
✅ **Touch Support**: Mobile-friendly click-to-assign mode  
✅ **Player Markers**: Circular avatars with gradient backgrounds  
✅ **Drop Zones**: Dashed circles that highlight on hover  
✅ **Player Pool**: Sidebar with available players and status badges  
✅ **Substitutes Bench**: 5 slots for backup players  
✅ **Exclusive Assignment**: Players can only be in one place (field/bench)  
✅ **Validation**: Ensures all positions filled before saving  
✅ **Responsive**: Works on mobile, tablet, desktop  
✅ **Theme Consistency**: Matches application's design system  
✅ **Auto-save**: Optional auto-save on every change  
✅ **Keyboard Shortcuts**: Escape to cancel, numbers to quick-select  

---

---

## 🎮 Match Preparation Popup - Tactics Tab Overhaul

### Overview

Redesign the **Tactics** tab in the Match Preparation Popup to use a simplified version of the main tactics dashboard, providing a consistent experience for lineup management before matches.

### Current State

**File**: `client/src/components/TacticsReview.tsx`

Currently shows:
- Formation dropdown (with descriptions like "2-2 (Balanced)")
- Tactical Style dropdown (Defensive/Balanced/Attacking)
- Starting Lineup list view (5 players)
- Substitutes list view (bench players)
- Team stats summary

**Issues**:
- No visual field representation
- Formation dropdown has old formations (2-2, 3-1, 4-0, 1-2-1, 1-3, 2-1-1)
- Tactical Style is separate from Instructions
- List-based player selection (not drag-and-drop)
- Different UX from main tactics page

### Proposed Changes

#### 1. Visual Layout

```
┌────────────────────────────────────────────┐
│  Formation & Controls                      │
│  [4-0 ▼] [Instructions] [Quick Fill]       │
├────────────────────────────────────────────┤
│                                            │
│           Mini Futsal Field                │
│              (Compact)                     │
│                                            │
│                ●                           │
│             ●     ●                        │
│                ●                           │
│                ●                           │
│           [Goalkeeper]                     │
│                                            │
├────────────────────────────────────────────┤
│  Substitutes Bench (Compact)               │
│  [#] [#] [ ] [ ] [ ]                       │
├────────────────────────────────────────────┤
│  Quick Player Selection (if not filled)    │
│  Top 5 by rating, click to assign         │
└────────────────────────────────────────────┤
```

#### 2. Component Structure

**File**: `client/src/components/match-prep/TacticsReviewV2.tsx` (new)

```typescript
interface TacticsReviewV2Props {
  currentFormation: Formation; // "4-0" | "3-1" | "2-2"
  startingLineup: number[];
  substitutes: number[];
  squad: Player[];
  onFormationChange: (formation: Formation) => void;
  onLineupChange: (lineup: number[]) => void;
  onSubstitutesChange: (subs: number[]) => void;
}

// Component hierarchy
TacticsReviewV2
├── TacticsControls
│   ├── FormationDropdown (compact, no descriptions)
│   ├── InstructionsButton (TBI - placeholder)
│   └── QuickFillButton (auto-assign best XI)
│
├── CompactFutsalField
│   ├── FieldBackground (smaller, simplified SVG)
│   ├── PositionSlot[] (5 positions based on formation)
│   └── PlayerMarker[] (smaller circles, just numbers)
│
├── CompactSubstitutesBench
│   └── SubstituteSlot[] (5 slots, horizontal)
│
└── QuickPlayerSelector (only if lineup incomplete)
    └── PlayerQuickCard[] (top available players by rating)
```

#### 3. Key Features

**Simplified Visual Field**:
- Smaller aspect ratio: 200px max width (vs 420px in main dashboard)
- Simplified player markers: just jersey number circle (no names below)
- Hover shows player name tooltip
- Click-to-assign mode only (no drag-and-drop in popup)
- Formation coordinates reused from main dashboard

**Formation Dropdown**:
- Updated to show only: **4-0**, **3-1**, **2-2**
- No descriptions, just formation names
- Compact width (w-24)

**Instructions Button**:
- Placed next to formation dropdown
- Opens same TacticalInstructionsDialog (TBI)
- "TBI" badge visible
- Same styling as main dashboard

**Quick Fill Button**:
- "Quick Fill" or "Auto Select" label
- Automatically assigns best 5 players + GK by rating
- Fills substitutes with next 5 best
- One-click convenience for quick matches

**Compact Substitutes Bench**:
- Horizontal row below field
- 5 slots, smaller circles
- Shows jersey number only
- Click to assign/remove

**Quick Player Selector**:
- Only appears if lineup is incomplete (< 6 players)
- Shows top 5-10 available players sorted by rating
- Compact cards: jersey number + name + rating
- Click to auto-assign to next available position
- Smart position matching (GK → GK slot, etc.)

**Interaction Model**:
- **Click-to-assign only** (no drag-and-drop due to space constraints)
- Click empty slot → shows available players
- Click player → auto-assigns to empty slot
- Click filled slot → removes player
- Simplified compared to main dashboard

#### 4. Validation

Same validation as main dashboard:
- Must have exactly 5 field players + 1 GK
- Must have GK in goalkeeper position
- Show warning if lineup incomplete
- Visual indicator (red border) on invalid slots

#### 5. Mobile Optimization

- Stacked layout on small screens
- Field scales down proportionally
- Touch-friendly tap targets (min 44px)
- Simplified tooltips instead of hover states

### Implementation Steps

#### Step 1: Create Compact Field Component (2 hours)

**File**: `client/src/components/match-prep/CompactFutsalField.tsx`

Features:
- Reuses FORMATIONS from main dashboard
- Smaller scale (200px max width)
- Simplified player markers (no labels)
- Click-to-assign interaction
- Tooltips on hover

#### Step 2: Create Quick Player Selector (1 hour)

**File**: `client/src/components/match-prep/QuickPlayerSelector.tsx`

Features:
- Shows when lineup incomplete
- Sorts players by rating
- Click to auto-assign
- Smart position matching

#### Step 3: Create Tactics Controls (1 hour)

**File**: `client/src/components/match-prep/TacticsControls.tsx`

Features:
- Formation dropdown (4-0, 3-1, 2-2)
- Instructions button (TBI)
- Quick Fill button
- Compact horizontal layout

#### Step 4: Update TacticsReview Component (2 hours)

**File**: `client/src/components/TacticsReview.tsx` or create new `TacticsReviewV2.tsx`

Options:
1. **Replace existing**: Update TacticsReview.tsx with new design
2. **Create V2**: Keep old version, create TacticsReviewV2.tsx, gradually migrate

Recommended: Create V2 to avoid breaking changes

#### Step 5: Update Match Preparation Popup (1 hour)

**File**: `client/src/components/MatchPreparationPopup.tsx`

Changes:
- Import TacticsReviewV2 instead of TacticsReview
- Update state to include substitutes management
- Remove old tactical preset dropdown (replaced by Instructions button)

#### Step 6: Testing & Polish (1 hour)

- Test all formations in popup
- Test Quick Fill functionality
- Test click-to-assign interaction
- Test validation
- Test on mobile devices
- Verify Instructions button placeholder

### Technical Considerations

**Shared Code**:
- Reuse `FORMATIONS` from `client/src/lib/formations.ts`
- Reuse `PlayerMarker` component (scaled down)
- Reuse `PositionSlot` component (simplified)
- Share validation logic

**State Management**:
```typescript
interface MatchPrepTacticsState {
  formation: Formation;
  assignments: Record<string, Player | null>; // field positions
  substitutes: (Player | null)[]; // 5 slots
  instructions?: TacticalInstructions; // TBI
}
```

**API Changes**:
- `POST /api/matches/:id/confirm-tactics` should accept:
  - `formation: Formation`
  - `startingLineup: number[]` (array of 5 player IDs + GK)
  - `substitutes: number[]` (array of up to 5 player IDs)
  - `instructions?: TacticalInstructions` (TBI)

### Visual Differences from Main Dashboard

| Feature | Main Dashboard | Match Prep Popup |
|---------|---------------|------------------|
| **Field Size** | 420px max width | 200px max width |
| **Player Labels** | Name below marker | Tooltip only |
| **Interaction** | Drag-and-drop + click | Click-to-assign only |
| **Player Pool** | Full sidebar list | Quick selector (if incomplete) |
| **Layout** | Two-column (field + pool) | Single column (stacked) |
| **Quick Fill** | Not available | "Quick Fill" button |
| **Save Button** | In header | In popup footer (external) |

### Benefits

✅ **Consistent UX**: Matches main tactics dashboard design
✅ **Visual Feedback**: See formation instead of just list
✅ **Quick Setup**: Auto-fill for fast match preparation
✅ **Simplified**: Optimized for popup constraints
✅ **Mobile-Friendly**: Touch-optimized click-to-assign
✅ **Instructions Ready**: Button placeholder for future implementation

---

## 🔮 Future Enhancements

### Phase 8 (Optional)

- **Complete Tactical Instructions Dialog**: Implement full functionality for:
  - Mentality slider (Defensive/Balanced/Attacking)
  - Width control (Narrow/Standard/Wide)
  - Tempo control (Slow/Normal/Fast)
  - Pressing intensity slider (1-10)
  - Save/Apply functionality
- **Player Chemistry**: Visual indicators showing player compatibility
- **Formation Presets**: Save multiple tactical setups ("Home", "Away", "Defensive")
- **Auto-Assignment**: "Best XI" button using player ratings
- **Player Stats**: Hover tooltips showing detailed stats
- **Position Heatmaps**: Show where players move during matches
- **Opponent Analysis**: Load opponent formation for comparison
- **Tactical Analysis**: AI suggestions based on team strengths

---

## 📊 Success Metrics

- ✅ All formations render correctly with proper spacing
- ✅ Drag-and-drop works smoothly on desktop (60 FPS)
- ✅ Touch interactions work on mobile without scroll interference
- ✅ Page loads in < 1 second
- ✅ Validation prevents invalid lineups
- ✅ Responsive design works on screens 320px - 4K
- ✅ Accessibility score 90+ on Lighthouse
- ✅ Zero console errors or warnings

---

## 🚀 Deployment Checklist

### Main Tactics Dashboard
- [ ] Create all component files (formations, field, slots, markers)
- [ ] Create formation definitions (4-0, 3-1, 2-2)
- [ ] Create futsal field SVG background
- [ ] Install react-dnd dependencies
- [ ] Implement drag-and-drop logic (desktop)
- [ ] Implement click-to-assign logic (mobile)
- [ ] Add validation rules (5 players + GK)
- [ ] Create substitutes bench component
- [ ] Add Instructions button (placeholder)
- [ ] Test all 3 formations
- [ ] Test on desktop browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Test on tablets (iPad, Android tablets)

### Match Preparation Popup - Tactics Tab
- [ ] Create CompactFutsalField component (200px max)
- [ ] Create QuickPlayerSelector component
- [ ] Create TacticsControls component
- [ ] Create TacticsReviewV2 component
- [ ] Update MatchPreparationPopup to use V2
- [ ] Implement Quick Fill auto-assignment
- [ ] Implement click-to-assign for popup
- [ ] Add Instructions button to popup
- [ ] Test popup tactics flow
- [ ] Test Quick Fill functionality
- [ ] Test mobile popup experience

### Backend & Integration
- [ ] Create backend API endpoints
- [ ] Update database schema (tactics field in playerTeam)
- [ ] Update match engine to use tactics
- [ ] Test save/load functionality
- [ ] Add accessibility features
- [ ] Update README documentation
- [ ] Create user guide/tutorial

---

## 📝 Notes

- Formation coordinates are percentage-based (0-100) for responsive scaling
- Player assignment is exclusive (can't be in two places at once)
- Goalkeeper is always required and locked to bottom center
- Formation changes preserve goalkeeper but clear other positions
- Backend stores tactics per save game, not globally
- Match engine uses tactics to determine starting lineup and formation

---

## 🎨 Color Palette

**Application Theme** (from `index.css`):
- Background: `rgb(248, 249, 250)` - Light gray background
- Foreground: `rgb(33, 37, 41)` - Dark text
- Card: `rgb(255, 255, 255)` - White cards
- Primary: `rgb(27, 67, 50)` - Dark green
- Secondary: `rgb(45, 106, 79)` - Medium green
- Accent: `rgb(64, 145, 108)` - Light green accent
- Muted: `rgb(241, 245, 249)` - Very light gray
- Border: `rgb(226, 232, 240)` - Light border
- Success: `rgb(40, 167, 69)` - Success green

**Field Design**:
- Field Background: `#15803d` (dark green)
- Field Lines: White with 60% opacity
- Grass Stripes: Alternating `#16a34a` and `#15803d`

**Player Markers**:
- Goalkeeper: `linear-gradient(180deg, #15803d 0%, #15803d 50%, #BBF7D0 50%, #BBF7D0 100%)`
- Outfield: `linear-gradient(180deg, #22c55e 0%, #22c55e 50%, #ffffff 50%, #ffffff 100%)`
- Label Background: `bg-slate-950/85` with white text

**Substitute Slots**:
- Empty: Dashed border `rgb(226, 232, 240)`, transparent background
- Filled: Solid border `rgb(27, 67, 50)`, white background
- Hover: Border changes to primary color with light background tint

---

## 🔗 References

- Design inspiration: Provided HTML structure
- React DnD Documentation: https://react-dnd.github.io/react-dnd/
- Futsal field dimensions: 40m × 20m (2:1 ratio, displayed as 3:2 for better UX)
- Position naming: Portuguese futsal terminology (Fixo, Ala, Pivot)

---

**Estimated Total Time**: 15-18 hours

**Priority**: High - Core gameplay feature

**Complexity**: Medium-High (drag-and-drop, responsive design, mobile touch)

**Status**: 📋 Planning Complete - Ready for Implementation