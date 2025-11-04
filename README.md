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
- [Getting Started](#getting-started)
- [Development](#development)
- [API Documentation](#api-documentation)

## Overview

Futsal Manager is a full-stack web application that simulates the experience of managing a professional futsal team. The game features:

- **Team Management**: Build and manage your squad with detailed player attributes
- **Player Development**: Train players with customizable focus areas and intensity levels
- **Match Simulation**: Real-time match simulation with minute-by-minute events
- **League Competition**: Compete against AI teams in a full season format
- **Financial Management**: Balance budgets, wages, and transfers
- **Tactical Depth**: Choose formations and tactical presets to influence matches

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Wouter** - Lightweight routing
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Radix UI** - Accessible UI components
- **Tailwind CSS** - Utility-first styling
- **date-fns** - Date manipulation

### Backend
- **Node.js** - Runtime environment
- **Express** - Web server framework
- **TypeScript** - Type safety
- **Drizzle ORM** - Database ORM
- **PostgreSQL (Neon)** - Database
- **tsx** - TypeScript execution

### Shared
- **TypeScript** - Shared types and schemas between client/server

## Project Structure

```
.
├── client/                  # Frontend application
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable UI components
│   │   │   └── ui/        # Radix UI components
│   │   └── lib/           # Utilities and stores
│   │       └── stores/    # Zustand state management
│   └── index.html         # HTML entry point
│
├── server/                 # Backend application
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API route definitions
│   ├── db.ts              # Database connection
│   ├── storage.ts         # Storage interface
│   ├── dbStorage.ts       # PostgreSQL implementation
│   ├── gameEngine.ts      # Game time and event processing
│   ├── competitionEngine.ts # League and fixture management
│   └── matchEngine.ts     # Match simulation logic
│
└── shared/                # Shared code
    └── schema.ts          # TypeScript interfaces and DB schema
```

## Key Features

### Implemented Features

1. **Player Management**
   - Dual-scale attribute system (0-200 internal, 0-20 display)
   - Detailed player attributes (shooting, passing, dribbling, pace, etc.)
   - Player contracts with salaries and release clauses
   - Injury and suspension tracking
   - Form and morale systems

2. **Training System**
   - Monthly training cycles
   - Four focus areas: Technical, Physical, Defensive, Mental
   - Three intensity levels: Low, Medium, High
   - Age-based growth curves (peak development 16-21 years)
   - Automatic training reports via inbox

3. **Match Simulation**
   - Real-time match simulation with events
   - Goals, cards, and substitutions
   - Match statistics (possession, shots, passes, etc.)
   - Player ratings (6.0-10.0 scale)
   - Home advantage modifier

4. **League Competition**
   - 12-team league with player team + 11 AI teams
   - Round-robin fixture generation (22 matchdays)
   - Live league standings with points, GD, and form
   - Automated fixture scheduling

5. **Time Progression**
   - Calendar-based game time
   - Day-by-day advancement
   - Monthly event processing
   - Season transitions (July)
   - Automatic player aging

6. **Financial Management**
   - Transfer budget tracking
   - Monthly wage payments
   - Financial transaction history
   - Budget alerts and notifications

7. **Inbox System**
   - Categorized messages (match, squad, financial, etc.)
   - Priority levels (low, medium, high)
   - Read/unread tracking
   - Training and monthly reports

### Planned Features

- Transfer market system
- Cup competitions
- Continental competitions
- Advanced tactical customization
- Scouting system
- Injury system with recovery
- Player personality traits
- Statistics dashboard

## Architecture

### Frontend Architecture

The frontend follows a component-based architecture with:

- **Pages**: Full-page components for each route
- **Components**: Reusable UI components built with Radix UI
- **Stores**: Zustand stores for global state management
- **API Layer**: TanStack Query for data fetching

Key pages:
- `HomePage`: Dashboard overview
- `SquadPage`: Player roster management
- `TacticsPage`: Formation and lineup setup
- `MatchesPage`: Fixtures and results
- `TrainingPage`: Player development
- `InboxPage`: Message center
- `FinancesPage`: Budget overview
- `ClubPage`: Facilities and staff

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
- **MemStorage Class**: In-memory implementation for testing

## Database Schema

### Core Tables

**Players**
- Player attributes (17 skill attributes)
- Contract details (salary, length, release clause)
- Status (injured, suspended, form, morale, fitness)
- Training focus settings

**Teams**
- Team information and finances
- Formation and tactics
- Starting lineup configuration

**Matches**
- Match details and scores
- Events (goals, cards, substitutions)
- Statistics for both teams
- Player ratings

**Competitions**
- Competition metadata
- Fixture lists
- League standings
- Current matchday tracking

**InboxMessages**
- Message categories and priorities
- Read/unread status
- Action links

**FinancialTransactions**
- Transaction type (income/expense)
- Categories (wages, transfers, etc.)
- Amount and description

**Clubs**
- Club facilities (training, stadium, youth academy)
- Staff (coaches, scouts)
- Board objectives

**GameState**
- Current date and season
- Active competitions
- Game progression state

### Attribute System

The game uses a dual-scale attribute system:
- **Internal Scale**: 0-200 (used for calculations)
- **Display Scale**: 0-20 (shown to players)

Conversion: `displayValue = Math.round(internalValue / 10)`

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (or use Replit's built-in database)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```
   DATABASE_URL=your_postgresql_connection_string
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
- `npm run db:push` - Push Drizzle schema to database
- `npm run db:push -- --force` - Force push schema changes

### Development Workflow

1. **Database Changes**
   - Modify schema in `shared/schema.ts`
   - Run `npm run db:push` to sync changes
   - Update `server/dbStorage.ts` if needed

2. **Adding Features**
   - Create/modify game engines in `server/`
   - Add API routes in `server/routes.ts`
   - Create/update UI components in `client/src/`
   - Update TypeScript interfaces in `shared/schema.ts`

3. **Testing**
   - Initialize a new game via the UI
   - Test time progression features
   - Simulate matches
   - Verify data persistence

### Code Style

- TypeScript strict mode enabled
- Functional components with hooks (React)
- Class-based engines (Backend)
- Async/await for asynchronous operations

## API Documentation

### Game State

- `POST /api/game/initialize` - Initialize new game
- `GET /api/game/state` - Get current game state
- `PATCH /api/game/state` - Update game state
- `POST /api/game/advance-day` - Advance one day
- `POST /api/game/advance-days` - Advance multiple days
- `POST /api/game/advance-month` - Advance one month

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
- `PATCH /api/inbox/:id` - Update message
- `DELETE /api/inbox/:id` - Delete message

### Finances

- `GET /api/club` - Get club details
- `PATCH /api/club` - Update club
- `GET /api/finances/transactions` - Get financial transactions

## Contributing

When contributing to this codebase:

1. Follow the existing code structure
2. Update TypeScript types in `shared/schema.ts`
3. Implement storage interface methods in `server/dbStorage.ts`
4. Test all database migrations with `npm run db:push`
5. Ensure type safety across client and server

## License

This project is for educational purposes.

## Acknowledgments

- Inspired by Football Manager series
- Built with modern web technologies
- Designed for the Replit platform
