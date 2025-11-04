# Futsal Manager

## Overview

Futsal Manager is a comprehensive web-based sports management simulation game where players manage their own futsal team through multiple seasons. The application features detailed player management with attribute-based progression, tactical customization, match simulation, league competitions, training systems, and financial management. Built as a full-stack TypeScript application, it provides an immersive Football Manager-style experience specifically tailored for futsal.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework and Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast hot-module replacement
- Wouter for lightweight client-side routing (avoiding heavier alternatives like React Router)

**State Management Strategy**
- Zustand for global state management (auth state, game data)
- TanStack Query for server state management, caching, and data synchronization
- Local component state with React hooks for UI-specific concerns

**UI Component System**
- Radix UI primitives for accessible, unstyled component foundations
- Tailwind CSS utility-first styling with custom design tokens
- Custom component library built on top of Radix (cards, dialogs, tables, badges)
- RGB-based color system with CSS custom properties for theming

**Key Design Decisions**
- Dashboard-based layout with persistent sidebar navigation
- Real-time game state synchronization between client and server
- Session-based authentication with secure HTTP-only cookies
- Optimistic UI updates with server reconciliation

### Backend Architecture

**Server Framework**
- Express.js web server with TypeScript
- Session management using express-session middleware
- RESTful API design for game operations

**Game Simulation Engines**
- **GameEngine**: Handles time progression (advancing days/months) and monthly event processing
- **MatchEngine**: Simulates individual matches with minute-by-minute events, calculates team ratings, and generates match statistics
- **CompetitionEngine**: Manages league structures, knockout tournaments, fixture generation, and standings calculation
- **SeedEngine**: Initializes new games with teams, players, and competitions

**Core Game Logic**
- Player attribute system using dual-scale approach (0-200 internal, 0-20 display)
- Age-based player development curves with position-specific training
- AI team generation with balanced squad creation
- Match simulation using team strength calculations and probability-based events

**Data Access Layer**
- Storage interface abstraction (`IStorage`) for database operations
- `DbStorage` implementation handling all PostgreSQL interactions
- Transaction support for multi-table operations (e.g., save game deletion)

### Data Storage Architecture

**Database**
- PostgreSQL (Neon serverless) as the primary data store
- Drizzle ORM for type-safe database queries and schema management
- WebSocket support for serverless PostgreSQL connections

**Schema Design**
- Multi-tenant architecture using `saveGameId` for data isolation
- Separate tables for: users, save games, game states, teams, players, matches, competitions, transfer offers, inbox messages, financial transactions, clubs
- JSONB columns for complex nested data (player attributes, match events, competition standings)
- Referential integrity maintained through foreign key relationships

**Data Isolation Strategy**
- User authentication via session-based tokens
- Active save game context stored in session
- All game data queries scoped by `saveGameId` to prevent cross-contamination
- Orphaned data cleanup utilities for maintaining database integrity

### Authentication and Authorization

**Authentication Mechanism**
- Username/password authentication with bcrypt hashing (10 rounds)
- Session-based authentication using express-session
- Session data includes userId and activeSaveGameId

**Authorization Pattern**
- Route-level middleware checks for authenticated session
- Save game validation ensures users only access their own data
- Server-side filtering of all queries by saveGameId and user ownership

### Game State Management

**Time Progression System**
- Calendar-based game advancement (day-by-day or bulk)
- Monthly event triggers for wages, player development, and morale changes
- Fixture scheduling tied to game calendar

**Player Development System**
- Attributes stored on 0-200 internal scale for granular progression
- Display values converted to 0-20 scale with whole number rounding
- Training gains vary by age, intensity, focus area, and playing time
- Potential ceiling prevents unlimited growth

**Competition Management**
- Support for multiple simultaneous competitions (leagues, cups)
- Round-robin fixture generation for league formats
- Knockout bracket support for cup competitions
- Real-time standings calculation based on match results

## External Dependencies

### Third-Party Services

**Database Provider**
- Neon serverless PostgreSQL for managed database hosting
- Connection pooling via `@neondatabase/serverless`
- WebSocket transport for serverless compatibility

### Core Libraries

**Backend Dependencies**
- `express`: Web server framework
- `drizzle-orm`: Type-safe database ORM
- `bcryptjs`: Password hashing
- `express-session`: Session management
- `tsx`: TypeScript execution for development

**Frontend Dependencies**
- `@tanstack/react-query`: Data fetching and caching
- `zustand`: Lightweight state management
- `@radix-ui/*`: Accessible UI component primitives
- `wouter`: Minimal routing library
- `date-fns`: Date manipulation utilities
- `tailwindcss`: Utility-first CSS framework

**Development Tools**
- `vite`: Build tool and dev server
- `drizzle-kit`: Database migration management
- `esbuild`: Production bundling

### Asset Management
- Font loading via `@fontsource/inter`
- GLSL shader support for potential 3D features (via vite-plugin-glsl)
- Static asset handling for game resources