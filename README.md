# Futsal Manager

A comprehensive web-based futsal management simulation game where players manage their own futsal team through multiple seasons. Inspired by Football Manager, this game features team management, player development, tactical setup, training programs, real-time match simulation, and participation in various competitions.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Game Engines](#game-engines)
- [Multi-User System](#multi-user-system)
- [Getting Started](#getting-started)
- [Development](#development)
- [API Documentation](#api-documentation)

## Overview

Futsal Manager is a full-stack web application that simulates the experience of managing a professional futsal team. The game features:

- **Multi-User Support**: Create accounts, manage multiple save games per user
- **Team Management**: Build and manage your squad with detailed player attributes
- **Player Development**: Train players with customizable focus areas and intensity levels
- **Match Simulation**: Real-time match simulation with minute-by-minute events
- **League Competition**: Compete against AI teams in a full season format
- **Financial Management**: Balance budgets, wages, and transfers
- **Tactical Depth**: Choose formations and tactical presets to influence matches
- **Inbox System**: Comprehensive message center for game notifications and reports

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety with strict mode
- **Vite** - Build tool and dev server
- **Wouter** - Lightweight routing
- **TanStack Query v5** - Server state management, automatic caching, and refetching
- **Zustand** - UI state management with subscribeWithSelector
- **Radix UI** - Accessible UI components (Dialog, Progress, Card, Badge, etc.)
- **Tailwind CSS** - Utility-first styling
- **Sonner** - Toast notifications
- **Lucide React** - Icon library
- **date-fns** - Date manipulation

### Backend
- **Node.js** - Runtime environment
- **Express** - Web server framework
- **TypeScript** - Type safety
- **Drizzle ORM** - Database ORM
- **PostgreSQL (Neon)** - Serverless database
- **express-session** - Session management
- **bcryptjs** - Password hashing
- **tsx** - TypeScript execution

### Shared
- **TypeScript** - Shared types and schemas between client/server

## Project Structure

```
.
├── client/                  # Frontend application
│   ├── src/
│   │   ├── pages/          # Page components
│   │   │   ├── HomePage.tsx            # Dashboard with Smart Continue
│   │   │   ├── SquadPage.tsx
│   │   │   ├── TacticsPage.tsx
│   │   │   ├── MatchesPage.tsx
│   │   │   ├── CompetitionsPage.tsx
│   │   │   ├── TrainingPage.tsx
│   │   │   ├── InboxPage.tsx
│   │   │   ├── FinancesPage.tsx
│   │   │   └── ClubPage.tsx
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ContinueButton.tsx      # Smart Continue button
│   │   │   ├── AdvancementOverlay.tsx  # Progress overlay
│   │   │   ├── NavigationLock.tsx      # Navigation blocker
│   │   │   ├── SeasonSummaryModal.tsx  # Season review dialog
│   │   │   ├── MatchPreparationPopup.tsx
│   │   │   ├── DashboardLayout.tsx     # App layout
│   │   │   ├── KnockoutBracket.tsx
│   │   │   ├── LeagueTable.tsx
│   │   │   └── ui/                     # Radix UI components
│   │   ├── hooks/          # Custom React hooks
│   │   │   ├── useContinue.tsx         # Smart event detection
│   │   │   ├── useMatchDay.tsx
│   │   │   ├── useServerState.ts       # TanStack Query hooks for server data
│   │   │   └── useGameActions.ts       # Bridge hooks for mutations
│   │   └── lib/           # Utilities and stores
│   │       ├── advancementEngine.ts    # Time progression orchestrator
│   │       ├── queryClient.ts          # TanStack Query configuration
│   │       ├── utils.ts
│   │       └── stores/    # Zustand state management
│   │           ├── useFutsalManager.ts # Backward compatibility wrapper
│   │           ├── useUIStore.ts       # UI-only state (NEW)
│   │           └── advancementStore.ts # Advancement state
│   └── index.html         # HTML entry point
│
├── server/                 # Backend application
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API route definitions (50+ endpoints)
│   ├── authRoutes.ts      # Authentication routes
│   ├── db.ts              # Database connection (Drizzle + Neon)
│   ├── storage.ts         # Storage interface (IStorage)
│   ├── dbStorage.ts       # PostgreSQL implementation
│   ├── gameEngine.ts      # Game time and event processing
│   ├── competitionEngine.ts # League and fixture management
│   ├── matchEngine.ts     # Full match simulation logic
│   ├── lightweightMatchEngine.ts # Fast Poisson-based simulation
│   ├── matchSimulator.ts  # Background match simulation orchestrator
│   ├── seedEngine.ts      # Initial data generation
│   └── vite.ts            # Vite dev server integration
│
└── shared/                # Shared code
    └── schema.ts          # TypeScript interfaces and DB schema
```

## Key Features

### ✨ Recently Added Features

1. **Background Match Simulation System** ⭐ *NEW*
   - Automatic simulation of AI vs AI matches when advancing time
   - Lightweight Poisson-based match engine (10-100x faster than full simulation)
   - Realistic score generation based on team strength and form
   - Home advantage multiplier (1.1x)
   - Parallel match processing for optimal performance
   - Automatic competition standings updates after simulation
   - Match statistics generation (possession, shots, passes)
   - Real-time simulation progress display in advancement overlay
   - User team matches protected (never auto-simulated)
   - Comprehensive logging for debugging

2. **Hybrid State Management** ⭐ *NEW*
   - Separated UI state (Zustand) from server state (TanStack Query)
   - Automatic cache management with TanStack Query
   - Granular query invalidation (only refetch what changed)
   - Per-query loading and error states
   - Optimistic updates support
   - React Query DevTools integration
   - Backward compatible with existing code
   - Improved performance (selective component re-renders)
   - Centralized query keys for consistent cache management

3. **Code Quality Improvements** ⭐ *NEW*
   - All TypeScript errors resolved
   - Strict type checking enabled
   - Pre-commit hooks for type safety
   - Centralized attribute conversion utilities
   - Consistent error handling patterns

### Core Features

4. **Multi-User System**
   - User registration and authentication
   - Session-based authentication with HTTP-only cookies
   - Password hashing with bcrypt (10 rounds)
   - Multiple save games per user
   - Active save game context management
   - Save game isolation (users can only access their own saves)

5. **Smart Continue System**
   - Intelligent event detection (matches, training, contracts, month-end, season-end)
   - Single "Continue" button that auto-advances to next important event
   - Smooth animated time progression (10-100ms per day with GPU acceleration)
   - Dynamic speed calculation based on days to advance
   - Real-time progress tracking with animated overlay
   - Pause/Resume/Stop controls during advancement
   - Event-specific handling:
     - **Matches**: Stops advancement, shows match preparation popup
     - **Training Completion**: Auto-processes, shows success notification
     - **Month End**: Auto-processes financial updates, shows info notification
     - **Contract Expiry**: Shows warning notification, continues
     - **Season End**: Stops advancement, shows comprehensive season summary modal
   - Navigation lock during time progression
   - Toast notifications for all events (powered by Sonner)
   - Season Summary Modal with:
     - Squad statistics (size, average age, average rating)
     - Board objectives completion tracking
     - Financial summary (budget, wage budget)
     - Performance rating based on objectives achieved
   - **Simulation summary**: Shows "Simulated X background matches" during time advancement

6. **Player Management**
   - Dual-scale attribute system (0-200 internal, 0-20 display)
   - Centralized conversion utilities (`internalToDisplay`, `displayToInternal`)
   - Detailed player attributes (shooting, passing, dribbling, pace, etc.)
   - Player contracts with salaries and release clauses
   - Injury and suspension tracking
   - Form and morale systems

7. **Training System**
   - Monthly training cycles
   - Four focus areas: Technical, Physical, Defensive, Mental
   - Three intensity levels: Low, Medium, High
   - Age-based growth curves (peak development 16-21 years)
   - Automatic training reports via inbox

8. **Match Simulation**
   - **Full Match Engine**: Real-time match simulation with minute-by-minute events
   - **Lightweight Engine**: Fast Poisson-based simulation for AI vs AI matches
   - Goals, cards, and substitutions
   - Match statistics (possession, shots, passes, etc.)
   - Player ratings (6.0-10.0 scale)
   - Home advantage modifier (1.1x)
   - Team strength calculation (70% ability, 30% fitness, multiplied by form and morale)
   - Automatic background simulation during time advancement

9. **Multiple Competitions**
   - **First Division**: 12-team league with player team + 11 AI teams (reputation 40-70)
   - **Second Division**: 12-team league with AI teams (reputation 30-50)
   - **National Cup**: 16-team knockout tournament (reputation 35-65)
   - Round-robin fixture generation for leagues (22 matchdays each)
   - Single-elimination bracket for cup competition (4 rounds)
   - Live league standings with points, GD, and form
   - Automated fixture scheduling

10. **Time Progression**
   - Calendar-based game time
   - Intelligent event-driven advancement system
   - Multiple advancement endpoints:
     - `POST /api/game/advance-day` - Single day advancement with background simulation
     - `POST /api/game/advance-until` - Day-by-day with stop support
     - `POST /api/game/advance-to-event` - Batch advance to target event
     - `GET /api/game/next-event` - Detect next actionable event
     - `GET /api/game/events-in-range` - Get all events in date range
   - **Background match simulation** - Automatically simulates all AI vs AI matches scheduled for each day
   - Monthly event processing (finances, training, contracts)
   - Season transitions (July)
   - Automatic player aging
   - Priority-based event system (1=highest to 5=lowest)
   - Simulation summary tracking (displays "Simulated X matches" in UI)

11. **Financial Management**
   - Transfer budget tracking
   - Monthly wage payments
   - Financial transaction history
   - Budget alerts and notifications

12. **Inbox System**
   - Categorized messages (match, squad, financial, etc.)
   - Priority levels (low, medium, high)
   - Read/unread tracking
   - Training and monthly reports
   - Unread message counter
   - Real-time updates via TanStack Query

### Club Database

The game initializes with a starting team containing:
- 15 players with varied attributes (displayed 8-16 on 0-20 scale)
- Balanced squad composition (2 goalkeepers, defenders, wingers, pivots)
- Starting club facilities and budget
- Initial welcome message from board

### Event System

The game features a priority-based event system for intelligent time advancement:

| Event Type | Priority | Action | Notification |
|------------|----------|--------|--------------|
| Match | 1 (Highest) | Stop, show tactics | Info toast |
| Training Completion | 2 | Auto-process | Success toast |
| Contract Expiry | 3 | Notify only | Warning toast |
| Month End | 4 | Auto-process | Info toast |
| Season End | 5 | Stop, show summary | Success toast |

## 🎮 Complete Features List

### ✅ Fully Implemented

#### User & Account Management
- [x] User registration and authentication
- [x] Session-based authentication (HTTP-only cookies)
- [x] Password hashing (bcrypt, 10 rounds)
- [x] Multiple save games per user
- [x] Save game creation, deletion, and switching
- [x] Data isolation between save games

#### Time Management
- [x] Smart Continue system with event detection
- [x] Animated time progression (10-100ms per day)
- [x] Pause/Resume/Stop controls
- [x] Navigation lock during advancement
- [x] Priority-based event system
- [x] Background match simulation during time advancement
- [x] Simulation progress tracking and display
- [x] Multiple advancement modes (single day, until event, batch)

#### Match System
- [x] Full match engine (minute-by-minute simulation)
- [x] Lightweight match engine (Poisson-based, 10-100x faster)
- [x] Automatic background simulation for AI vs AI matches
- [x] User team match protection (never auto-simulated)
- [x] Match preparation popup
- [x] Match statistics (possession, shots, passes, etc.)
- [x] Player ratings (6.0-10.0 scale)
- [x] Goals, cards, and substitutions
- [x] Home advantage (1.1x multiplier)
- [x] Team strength calculation (ability + fitness + form + morale)

#### Competition System
- [x] First Division (12 teams, round-robin, 22 matchdays)
- [x] Second Division (12 teams, round-robin, 22 matchdays)
- [x] National Cup (16 teams, single elimination, 4 rounds)
- [x] League standings with live updates
- [x] Form tracking (last 5 matches)
- [x] Automatic fixture scheduling
- [x] Batch standings updates for simulated matches
- [x] Competition overview pages

#### Player Management
- [x] 17 detailed player attributes (0-200 internal, 0-20 display)
- [x] Centralized attribute conversion utilities
- [x] Player contracts (salary, length, release clause)
- [x] Form, morale, fitness, and condition tracking
- [x] Injury and suspension system
- [x] Yellow and red card tracking
- [x] Player value calculation
- [x] Position-specific attributes (GK: reflexes, handling, etc.)

#### Training System
- [x] Monthly training cycles
- [x] Four focus areas (Technical, Physical, Defensive, Mental)
- [x] Three intensity levels (Low, Medium, High)
- [x] Age-based growth curves (peak at 16-21)
- [x] Individual player training focus
- [x] Automatic training reports via inbox
- [x] Attribute improvement calculations

#### Tactical System
- [x] Formation selection (2-2, 3-1, 1-2-1, etc.)
- [x] Tactical presets (Balanced, Attacking, Defensive, Counter-Attack, Possession)
- [x] Starting lineup management
- [x] Substitute bench management
- [x] Formation validation
- [x] Tactics review and confirmation

#### Financial System
- [x] Transfer budget tracking
- [x] Wage budget management
- [x] Monthly wage payments
- [x] Transaction history (income/expense)
- [x] Budget alerts and notifications
- [x] Financial summary displays

#### Club Management
- [x] Training facilities (1-5 levels)
- [x] Stadium capacity
- [x] Youth academy (1-5 levels)
- [x] Staff management (coaches, scouts)
- [x] Board objectives tracking
- [x] Objective completion status
- [x] Club information page

#### Communication System
- [x] Inbox with categorized messages
- [x] Priority levels (low, medium, high)
- [x] Read/unread tracking
- [x] Message filtering by category
- [x] Unread count badge
- [x] Training reports
- [x] Monthly financial reports
- [x] Match notifications
- [x] Real-time updates via TanStack Query

#### UI/UX
- [x] Responsive dashboard layout
- [x] Dark mode support (via next-themes)
- [x] Toast notifications (Sonner)
- [x] Loading states and skeletons
- [x] Progress bars and indicators
- [x] Modal dialogs (season summary, match prep)
- [x] Accessible UI components (Radix UI)
- [x] GPU-accelerated animations
- [x] Navigation breadcrumbs
- [x] Page-specific layouts

#### Technical Infrastructure
- [x] TypeScript strict mode
- [x] Pre-commit type checking hooks
- [x] Hybrid state management (TanStack Query + Zustand)
- [x] Automatic cache management
- [x] Granular query invalidation
- [x] Error boundaries and handling
- [x] Comprehensive logging
- [x] Database schema versioning (Drizzle)
- [x] Session management (express-session)
- [x] PostgreSQL with Neon serverless

### 🚧 Planned Features

#### Transfer System
- [ ] Transfer market with available players
- [ ] AI-driven transfer negotiations
- [ ] Contract offers and counteroffers
- [ ] Loan deals
- [ ] Transfer deadline day
- [ ] Free agent signings

#### Advanced Competitions
- [ ] Continental competitions (Champions League equivalent)
- [ ] Super Cup
- [ ] Promotion/relegation system
- [ ] Multi-season competition history

#### Player Development
- [ ] Youth academy with generated players
- [ ] Player personality traits
- [ ] Mentoring system
- [ ] Player morale conversations
- [ ] Career mode with player retirement

#### Tactical Depth
- [ ] Custom formation creator
- [ ] Player instructions (individual roles)
- [ ] Set piece tactics
- [ ] In-match tactical adjustments
- [ ] Opposition instructions

#### Scouting
- [ ] Scout network
- [ ] Player discovery system
- [ ] Scout reports with recommendations
- [ ] Hidden gems and wonderkids

#### Statistics
- [ ] Comprehensive stats dashboard
- [ ] Historical season records
- [ ] Player career statistics
- [ ] Team performance graphs
- [ ] Competition history

#### Media & Interaction
- [ ] Press conferences
- [ ] Media interactions
- [ ] Fan satisfaction tracking
- [ ] Board confidence meter
- [ ] News feed

#### Enhanced Simulation
- [ ] 3D match viewer
- [ ] Extended highlights
- [ ] Commentary system
- [ ] Match replays

#### Multiplayer (Future)
- [ ] Online leagues with friends
- [ ] Head-to-head seasons
- [ ] Leaderboards

## Architecture

### Frontend Architecture

The frontend follows a **Hybrid State Management** architecture:

#### **State Management Layers**

1. **Server State (TanStack Query)**
   - All game data from API (players, matches, competitions, etc.)
   - Automatic caching and invalidation
   - Per-query loading and error states
   - Optimistic updates support
   - Hooks in `hooks/useServerState.ts`:
     - `useGameState()`, `usePlayers()`, `useCompetitions()`, etc.

2. **UI State (Zustand)**
   - UI-only state (modals, popups, selections)
   - `useUIStore` - Match popups, season summary, initialization status
   - `useAdvancementStore` - Time advancement state (progress, events, pause/resume)

3. **Bridge Layer**
   - `useGameActions()` - Combines mutations with UI updates
   - `useFutsalManager()` - Backward compatibility wrapper (deprecated, use new hooks)

#### **Key Components**
- **Pages**: Full-page components for each route
- **Components**: Reusable UI components built with Radix UI
- **Custom Hooks**: 
  - `useContinue` - Smart event detection and button logic
  - `useMatchDay` - Match day detection and handling
  - `useServerState` - TanStack Query hooks for all server data
  - `useGameActions` - Game mutations with automatic cache invalidation
- **Engines**:
  - `advancementEngine` - Orchestrates time progression with animation and simulation
- **UI Components**:
  - `ContinueButton` - Smart button with dynamic label and icon
  - `AdvancementOverlay` - Full-screen progress display with controls and simulation counter
  - `NavigationLock` - Prevents navigation during advancement
  - `SeasonSummaryModal` - Comprehensive season review dialog
  - `MatchPreparationPopup` - Match day tactics confirmation

Key pages:
- `HomePage`: Dashboard overview with Smart Continue button
- `SquadPage`: Player roster management
- `TacticsPage`: Formation and lineup setup
- `MatchesPage`: Fixtures and results
- `CompetitionsPage`: League tables and competition overview
- `TrainingPage`: Player development
- `InboxPage`: Message center with categorized messages
- `FinancesPage`: Budget overview and transaction history
- `ClubPage`: Facilities and staff management

### Backend Architecture

The backend uses a modular engine-based architecture:

```
┌─────────────────┐
│   API Routes    │ ← Express endpoints
└────────┬────────┘
         │
    ┌────┴────┐
    │ Engines │
    └────┬────┘
         │
    ┌────┴─────────┬──────────────┬───────────┐
    │              │              │           │
┌───▼────┐  ┌─────▼─────┐  ┌─────▼────┐  ┌──▼──────┐
│ Game   │  │Competition│  │  Match   │  │ Storage │
│ Engine │  │  Engine   │  │  Engine  │  │Interface│
└────────┘  └───────────┘  └──────────┘  └─────────┘
                                              │
                                          ┌───▼────┐
                                          │   DB   │
                                          │Storage │
                                          └───┬────┘
                                              │
                                          ┌───▼──────┐
                                          │PostgreSQL│
                                          └──────────┘
```

### Game Engines

1. **GameEngine** (`server/gameEngine.ts`)
   - Time progression (advance days, weeks, months)
   - **Integrated background match simulation** via MatchSimulator
   - Monthly event processing
   - Player development calculations
   - Player aging (annual in July)
   - Season transitions
   - Returns simulation summary in API responses

2. **CompetitionEngine** (`server/competitionEngine.ts`)
   - AI team generation
   - Squad creation for AI teams
   - Round-robin fixture generation
   - League standings management
   - Match result processing
   - **Batch standings updates** for simulated matches
   - JSONB array/object conversion handling

3. **MatchEngine** (`server/matchEngine.ts`)
   - **Full match simulation** with minute-by-minute events
   - Team rating calculations
   - Event generation (goals, cards, substitutions)
   - Match statistics generation
   - Player rating calculation (6.0-10.0 scale)

4. **LightweightMatchEngine** (`server/lightweightMatchEngine.ts`) ⭐ *NEW*
   - **Fast Poisson-based simulation** (10-100x faster than full engine)
   - Realistic goal generation using Poisson distribution
   - Team strength calculation (70% ability, 30% fitness)
   - Home advantage multiplier (1.1x)
   - Form and morale modifiers
   - Basic statistics generation
   - No detailed event tracking (optimized for speed)

5. **MatchSimulator** (`server/matchSimulator.ts`) ⭐ *NEW*
   - Orchestrates background match simulation
   - **Batch processes all AI vs AI matches** scheduled for a day
   - Filters out user team matches (never auto-simulated)
   - Parallel match processing with `Promise.all`
   - Updates match results in database
   - Returns simulation summary (count and results)
   - Error handling with graceful fallback

### Storage Layer

The storage layer uses an interface-based design:

- **IStorage Interface**: Defines all data operations
- **DbStorage Class**: PostgreSQL implementation using Drizzle ORM

All operations are scoped by `saveGameId` to ensure data isolation between users' save games.

## Database Schema

### Multi-User Architecture

The database uses a multi-tenant architecture with the following hierarchy:

```
Users (authentication)
  └── SaveGames (user's game instances)
       ├── GameState (current date, season, etc.)
       ├── Players (all players in save game)
       ├── Teams (all teams in save game)
       ├── Matches (all matches in save game)
       ├── Competitions (all competitions in save game)
       ├── TransferOffers (all offers in save game)
       ├── InboxMessages (all messages in save game)
       ├── FinancialTransactions (all transactions in save game)
       └── Clubs (club data in save game)
```

### Core Tables

**users**
- User authentication data (username, email, hashed password)
- Created timestamp

**saveGames**
- Save game metadata (name, userId)
- Created and updated timestamps

**players**
- Player attributes (17 skill attributes on 0-200 scale)
- Contract details (salary, length, release clause)
- Status (injured, suspended, form, morale, fitness)
- Training focus settings
- Foreign key: saveGameId

**teams**
- Team information and finances
- Formation and tactics
- Starting lineup configuration
- Foreign key: saveGameId

**matches**
- Match details and scores
- Events (goals, cards, substitutions)
- Statistics for both teams
- Player ratings
- Foreign key: saveGameId

**competitions**
- Competition metadata
- Fixture lists (stored separately in matches table)
- League standings
- Current matchday tracking
- Foreign key: saveGameId

**inboxMessages**
- Message categories and priorities
- Read/unread status
- Action links
- Foreign key: saveGameId

**financialTransactions**
- Transaction type (income/expense)
- Categories (wages, transfers, etc.)
- Amount and description
- Foreign key: saveGameId

**clubs**
- Club facilities (training, stadium, youth academy)
- Staff (coaches, scouts)
- Board objectives
- Foreign key: saveGameId

**gameStates**
- Current date and season
- Active competitions (references competitions table)
- Game progression state
- Foreign key: saveGameId

### Attribute System

The game uses a dual-scale attribute system:
- **Internal Scale**: 0-200 (used for calculations)
- **Display Scale**: 0-20 (shown to players, whole numbers only)

Conversion: `displayValue = Math.round(internalValue / 10)`

## Multi-User System

### Authentication Flow

1. User registers with username, email, and password
2. Password is hashed with bcrypt (10 rounds)
3. User logs in and receives session cookie
4. Session cookie is HTTP-only and secure
5. Session stores userId and activeSaveGameId

### Save Game Management

- Users can create multiple save games
- Each save game is completely isolated from others
- Switching between save games updates session context
- All API calls automatically use the active save game
- Deleting a save game cleans up all associated data

### Data Isolation

All database queries are automatically scoped by `saveGameId`:
- `storage.getPlayer(saveGameId, id)` - Only returns player from that save
- `storage.getAllPlayers(saveGameId)` - Only returns players from that save
- All operations follow this pattern

The server tracks which save game is active in the session and automatically passes the correct `saveGameId` to all storage methods.

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (or Neon serverless PostgreSQL)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```
   DATABASE_URL=your_postgresql_connection_string
   SESSION_SECRET=your_random_secret_key
   ```

4. Push database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Development

### Project Commands

- `npm run dev` - Start development server (runs both client and server)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking (with strict mode)
- `npm run db:push` - Push Drizzle schema to database
- `npm run db:push -- --force` - Force push schema changes

### Pre-commit Hooks

The project includes a pre-commit hook that automatically runs TypeScript type checking before each commit. This prevents commits with type errors from entering the codebase.

To bypass the hook (use sparingly):
```bash
git commit --no-verify
```

### Development Workflow

1. **Database Changes**
   - Modify schema in `shared/schema.ts`
   - Run `npm run db:push` to sync changes
   - Update `server/dbStorage.ts` if needed
   - Test with existing save games

2. **Adding Features**
   - Create/modify game engines in `server/`
   - Add API routes in `server/routes.ts` or `server/authRoutes.ts`
   - Create/update UI components in `client/src/components/`
   - Add pages in `client/src/pages/`
   - Create custom hooks in `client/src/hooks/` if needed
   - Update TypeScript interfaces in `shared/schema.ts`
   - Add state management in `client/src/lib/stores/` if needed

3. **Testing Smart Continue System**
   - Click "Continue" button on dashboard
   - Observe animated time progression
   - Test pause/resume/stop controls
   - Verify match day stops correctly
   - Check season summary modal appears at season end
   - Test toast notifications for all event types

4. **General Testing**
   - Register a new user account
   - Create a new save game
   - Test time progression features
   - Simulate matches and check results
   - Verify data persistence and isolation
   - Test all competitions (league, cup)

### Code Style

- **TypeScript strict mode** enabled (all files must pass type checking)
- **Functional components** with hooks (React)
- **Class-based engines** (Backend)
- **Async/await** for asynchronous operations
- **Dual-scale attributes**: 
  - Stored on 0-200 scale internally
  - Displayed as 0-20 scale (whole numbers only)
  - Use `internalToDisplay()` and `displayToInternal()` helpers in `shared/schema.ts`
- **State management**:
  - TanStack Query for server state
  - Zustand for UI state only
  - Centralized query keys in `hooks/useServerState.ts`
  - Automatic cache invalidation
- **UI Components**:
  - Radix UI for accessible, composable components
  - Tailwind CSS with custom utility classes
  - GPU-accelerated animations with CSS transforms
- **Error handling**:
  - Pre-commit hooks prevent type errors
  - Comprehensive logging in server engines
  - Graceful error fallbacks in UI

## API Documentation

### Authentication

- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `GET /api/user` - Get current user

### Save Games

- `GET /api/save-games` - Get all save games for current user
- `POST /api/save-games` - Create new save game
- `POST /api/save-games/:id/activate` - Set active save game
- `DELETE /api/save-games/:id` - Delete save game

### Game State

- `POST /api/game/initialize` - Initialize new game (creates initial data for active save)
- `GET /api/game/state` - Get current game state
- `PATCH /api/game/state` - Update game state

### Time Advancement (Smart Continue System)

- `POST /api/game/advance-day` - Advance one day (legacy)
- `POST /api/game/advance-until` - Day-by-day advancement with cancellation support
- `POST /api/game/advance-to-event` - Batch advance to target event
- `GET /api/game/next-event` - Get next actionable event with priority
- `GET /api/game/events-in-range` - Get all events in date range
- `POST /api/game/advance-days` - Advance multiple days (legacy)
- `POST /api/game/advance-month` - Advance one month (legacy)

### Teams

- `GET /api/team/player` - Get player's team
- `GET /api/team/:id` - Get team by ID
- `PATCH /api/team/:id` - Update team

### Players

- `GET /api/players` - Get all players
- `GET /api/players/team/:teamId` - Get players by team
- `GET /api/players/:id` - Get player by ID
- `PATCH /api/players/:id` - Update player

### Matches

- `GET /api/matches` - Get all matches
- `GET /api/matches/:id` - Get match by ID
- `POST /api/matches/:id/simulate` - Simulate match

### Competitions

- `GET /api/competitions` - Get all competitions
- `GET /api/competitions/:id` - Get competition by ID

### Inbox

- `GET /api/inbox` - Get all inbox messages
- `POST /api/inbox/:id/read` - Mark message as read
- `PATCH /api/inbox/:id` - Update message
- `DELETE /api/inbox/:id` - Delete message

### Finances

- `GET /api/club` - Get club details
- `PATCH /api/club` - Update club
- `GET /api/finances/transactions` - Get financial transactions

All API endpoints (except auth) require authentication and automatically use the active save game from the session.

## 📈 Recent Improvements (November 2024)

### Background Match Simulation
- Implemented lightweight Poisson-based match engine for AI vs AI matches
- Automatic simulation during time advancement (no manual intervention needed)
- 10-100x performance improvement over full match engine
- Realistic score generation with team strength calculations
- Parallel match processing for optimal performance
- Real-time simulation counter in UI ("Simulated X matches")
- User team matches always protected from auto-simulation

### Hybrid State Management
- Separated concerns: TanStack Query (server state) + Zustand (UI state)
- Automatic cache management with smart invalidation
- Per-query loading and error states
- Improved performance with selective component re-renders
- Backward compatible wrapper for existing code
- React Query DevTools integration for debugging
- Centralized query keys for consistency

### Code Quality
- Fixed all TypeScript errors across codebase
- Added pre-commit hooks for type safety
- Centralized attribute conversion utilities
- Consistent error handling patterns
- Comprehensive logging in game engines
- JSONB array/object conversion handling
- Strict type checking enabled

### Performance Optimizations
- Granular query invalidation (only refetch what changed)
- Background refetching for stale data
- Optimistic updates support
- GPU-accelerated animations
- Parallel match simulation processing
- Efficient cache management

### Documentation
- Updated README with complete features list
- Added HYBRID-STATE-MANAGEMENT.md guide
- Documented all API endpoints
- Added code examples and usage patterns
- Migration guide for new state management

## Contributing

When contributing to this codebase:

1. Follow the existing code structure
2. Update TypeScript types in `shared/schema.ts`
3. Implement storage interface methods in `server/dbStorage.ts`
4. All storage methods must accept `saveGameId` as first parameter
5. Test all database migrations with `npm run db:push`
6. Ensure type safety across client and server (run `npm run check`)
7. Test data isolation between save games
8. Use TanStack Query hooks for server state, Zustand for UI state
9. Follow attribute conversion standards (0-200 internal, 0-20 display)
10. Add comprehensive logging for debugging

## License

This project is for educational purposes.

## Acknowledgments

- Inspired by Football Manager series
- Built with modern web technologies
- Multi-user architecture for scalability
- Community-driven feature development
