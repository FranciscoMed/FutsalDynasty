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
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Wouter** - Lightweight routing
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management with subscribeWithSelector
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
│   │   │   └── useMatchDay.tsx
│   │   └── lib/           # Utilities and stores
│   │       ├── advancementEngine.ts    # Time progression orchestrator
│   │       ├── queryClient.ts
│   │       ├── utils.ts
│   │       └── stores/    # Zustand state management
│   │           ├── useFutsalManager.ts # Main game store
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
│   ├── matchEngine.ts     # Match simulation logic
│   ├── seedEngine.ts      # Initial data generation
│   └── vite.ts            # Vite dev server integration
│
└── shared/                # Shared code
    └── schema.ts          # TypeScript interfaces and DB schema
```

## Key Features

### Implemented Features

1. **Multi-User System**
   - User registration and authentication
   - Session-based authentication with HTTP-only cookies
   - Password hashing with bcrypt (10 rounds)
   - Multiple save games per user
   - Active save game context management
   - Save game isolation (users can only access their own saves)

2. **Smart Continue System** ⭐ *NEW*
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

3. **Player Management**
   - Dual-scale attribute system (0-200 internal, 0-20 display)
   - Detailed player attributes (shooting, passing, dribbling, pace, etc.)
   - Player contracts with salaries and release clauses
   - Injury and suspension tracking
   - Form and morale systems

3. **Training System**
   - Monthly training cycles
   - Four focus areas: Technical, Physical, Defensive, Mental
   - Three intensity levels: Low, Medium, High
   - Age-based growth curves (peak development 16-21 years)
   - Automatic training reports via inbox

4. **Match Simulation**
   - Real-time match simulation with events
   - Goals, cards, and substitutions
   - Match statistics (possession, shots, passes, etc.)
   - Player ratings (6.0-10.0 scale)
   - Home advantage modifier

5. **Multiple Competitions**
   - **First Division**: 12-team league with player team + 11 AI teams (reputation 40-70)
   - **Second Division**: 12-team league with AI teams (reputation 30-50)
   - **National Cup**: 16-team knockout tournament (reputation 35-65)
   - Round-robin fixture generation for leagues (22 matchdays each)
   - Single-elimination bracket for cup competition (4 rounds)
   - Live league standings with points, GD, and form
   - Automated fixture scheduling

6. **Time Progression**
   - Calendar-based game time
   - Intelligent event-driven advancement system
   - Multiple advancement endpoints:
     - `POST /api/game/advance-day` - Single day advancement
     - `POST /api/game/advance-until` - Day-by-day with stop support
     - `POST /api/game/advance-to-event` - Batch advance to target event
     - `GET /api/game/next-event` - Detect next actionable event
     - `GET /api/game/events-in-range` - Get all events in date range
   - Monthly event processing (finances, training, contracts)
   - Season transitions (July)
   - Automatic player aging
   - Priority-based event system (1=highest to 5=lowest)

7. **Financial Management**
   - Transfer budget tracking
   - Monthly wage payments
   - Financial transaction history
   - Budget alerts and notifications

8. **Inbox System**
   - Categorized messages (match, squad, financial, etc.)
   - Priority levels (low, medium, high)
   - Read/unread tracking
   - Training and monthly reports
   - Unread message counter

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

### Planned Features

- Transfer market system with AI negotiations
- Continental competitions (UEFA Futsal Cup equivalent)
- Advanced tactical customization (custom formations)
- Scouting system with player discovery
- Enhanced injury system with recovery times
- Player personality traits and mentoring
- Comprehensive statistics dashboard
- Promotion/relegation between divisions
- Press conferences and media interactions
- Staff hiring and development
- Youth academy with player generation

## Architecture

### Frontend Architecture

The frontend follows a component-based architecture with:

- **Pages**: Full-page components for each route
- **Components**: Reusable UI components built with Radix UI
- **Stores**: Zustand stores for global state management
  - `useFutsalManager` - Main game state (teams, players, matches)
  - `useAdvancementStore` - Time advancement state (progress, events, pause/resume)
- **API Layer**: TanStack Query for data fetching and caching
- **Custom Hooks**: 
  - `useContinue` - Smart event detection and button logic
  - `useMatchDay` - Match day detection and handling
- **Engines**:
  - `advancementEngine` - Orchestrates time progression with animation
- **Components**:
  - `ContinueButton` - Smart button with dynamic label and icon
  - `AdvancementOverlay` - Full-screen progress display with controls
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
   - Monthly event processing
   - Player development calculations
   - Player aging (annual in July)
   - Season transitions

2. **CompetitionEngine** (`server/competitionEngine.ts`)
   - AI team generation
   - Squad creation for AI teams
   - Round-robin fixture generation
   - League standings management
   - Match result processing

3. **MatchEngine** (`server/matchEngine.ts`)
   - Match simulation algorithm
   - Team rating calculations
   - Event generation (goals, cards)
   - Match statistics generation
   - Player rating calculation

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
- `npm run check` - Run TypeScript type checking
- `npm run db:push` - Push Drizzle schema to database
- `npm run db:push -- --force` - Force push schema changes

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

- TypeScript strict mode enabled
- Functional components with hooks (React)
- Class-based engines (Backend)
- Async/await for asynchronous operations
- All player attributes stored on 0-200 scale internally
- All UI displays show 0-20 scale as whole numbers
- Zustand stores with subscribeWithSelector for optimized re-renders
- TanStack Query for all API calls with proper caching
- Radix UI for accessible, composable components
- Tailwind CSS with custom utility classes
- GPU-accelerated animations with CSS transforms

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

## Contributing

When contributing to this codebase:

1. Follow the existing code structure
2. Update TypeScript types in `shared/schema.ts`
3. Implement storage interface methods in `server/dbStorage.ts`
4. All storage methods must accept `saveGameId` as first parameter
5. Test all database migrations with `npm run db:push`
6. Ensure type safety across client and server
7. Test data isolation between save games

## License

This project is for educational purposes.

## Acknowledgments

- Inspired by Football Manager series
- Built with modern web technologies
- Multi-user architecture for scalability
