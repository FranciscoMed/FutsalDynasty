import { Server as SocketIOServer, Socket } from 'socket.io';
import { MatchEngine } from './matchEngine';
import { CompetitionEngine } from './competitionEngine';
import type { 
  LiveMatchState, 
  MatchEvent, 
  OnCourtPlayer,
  TacticalSetup
} from '../shared/schema';
import type { IStorage } from './storage';

/**
 * Match update message sent to clients every tick
 */
export interface MatchUpdate {
  minute: number;
  second: number;
  score: { home: number; away: number };
  events: MatchEvent[];
  statistics: LiveMatchState['statistics'];
  momentum: { value: number; trend: 'home' | 'away' | 'neutral' };
  commentary?: string;
  lineups: { 
    home: OnCourtPlayer[]; 
    away: OnCourtPlayer[] 
  };
  tactics: {
    home: TacticalSetup;
    away: TacticalSetup;
  };
  suspendedPlayers?: {
    home: number[];
    away: number[];
  };
  tickNumber: number;
}

/**
 * User action types
 */
export type MatchAction = 
  | { type: 'substitute'; team: 'home' | 'away'; playerOutId: number; playerInId: number }
  | { type: 'change-formation'; team: 'home' | 'away'; formation: string }
  | { type: 'change-tactics'; team: 'home' | 'away'; tactics: Partial<TacticalSetup> }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'speed'; speed: 1 | 2 | 4 };

/**
 * Active match session
 */
interface MatchSession {
  matchId: number;
  saveGameId: number;
  userId: number;
  engine: MatchEngine;
  speed: 1 | 2 | 4;
  isPaused: boolean;
  currentTick: number;
  timer: NodeJS.Timeout | null;
  watchers: Set<string>; // socket IDs
}

/**
 * Real-time match simulator for live matches
 * Manages WebSocket-based match streaming with tick-by-tick updates
 */
export class RealtimeMatchSimulator {
  private io: SocketIOServer;
  private storage: IStorage;
  private competitionEngine: CompetitionEngine;
  private activeSessions = new Map<number, MatchSession>();
  
  // Tick timing (15 seconds simulated time per tick)
  private readonly BASE_TICK_INTERVAL = 15000; // 15s simulated
  private readonly SPEED_MULTIPLIERS = {
    1: 0.25,   // 3.75s real-time per tick (10 min for 40-min match)
    2: 0.125,  // 1.875s real-time per tick (5 min for 40-min match)
    4: 0.0625  // 0.9375s real-time per tick (2.5 min for 40-min match)
  };

  constructor(io: SocketIOServer, storage: IStorage, competitionEngine: CompetitionEngine) {
    this.io = io;
    this.storage = storage;
    this.competitionEngine = competitionEngine;
    this.setupSocketHandlers();
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[RealtimeMatch] Client connected: ${socket.id}`);

      // Join match room
      socket.on('join-match', async (data: { matchId: number; saveGameId: number; userId: number }) => {
        try {
          await this.handleJoinMatch(socket, data.matchId, data.saveGameId, data.userId);
        } catch (error) {
          console.error(`[RealtimeMatch] Error joining match ${data.matchId}:`, error);
          socket.emit('match:error', { 
            message: 'Failed to join match',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // User actions
      socket.on('match:action', async (data: { matchId: number; action: MatchAction }) => {
        console.log(`[RealtimeMatch] Received action for match ${data.matchId}:`, data.action);
        try {
          await this.handleMatchAction(socket, data.matchId, data.action);
          console.log(`[RealtimeMatch] Successfully processed action for match ${data.matchId}`);
        } catch (error) {
          console.error(`[RealtimeMatch] Error handling action for match ${data.matchId}:`, error);
          socket.emit('match:error', { 
            message: 'Failed to process action',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Leave match room
      socket.on('leave-match', (matchId: number) => {
        this.handleLeaveMatch(socket, matchId);
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log(`[RealtimeMatch] Client disconnected: ${socket.id}`);
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handle client joining a match
   */
  private async handleJoinMatch(
    socket: Socket, 
    matchId: number, 
    saveGameId: number, 
    userId: number
  ): Promise<void> {
    const roomName = `match-${matchId}`;
    await socket.join(roomName);

    const session = this.activeSessions.get(matchId);
    
    if (session) {
      // Match already running - send current state
      session.watchers.add(socket.id);
      
      const state = session.engine.getState();
      socket.emit('match:joined', {
        matchId,
        state: this.createMatchUpdate(state, session.currentTick),
        speed: session.speed,
        isPaused: session.isPaused
      });
      
      console.log(`[RealtimeMatch] Client ${socket.id} joined active match ${matchId} (${session.watchers.size} watchers)`);
    } else {
      // Start new match session
      await this.startMatch(matchId, saveGameId, userId);
      
      const newSession = this.activeSessions.get(matchId);
      if (newSession) {
        newSession.watchers.add(socket.id);
        
        const state = newSession.engine.getState();
        socket.emit('match:joined', {
          matchId,
          state: this.createMatchUpdate(state, newSession.currentTick),
          speed: newSession.speed,
          isPaused: newSession.isPaused
        });
        
        console.log(`[RealtimeMatch] Client ${socket.id} started new match ${matchId}`);
      }
    }
  }

  /**
   * Handle client leaving a match
   */
  private handleLeaveMatch(socket: Socket, matchId: number): void {
    const session = this.activeSessions.get(matchId);
    if (session) {
      session.watchers.delete(socket.id);
      console.log(`[RealtimeMatch] Client ${socket.id} left match ${matchId} (${session.watchers.size} watchers remaining)`);
      
      // Clean up if no watchers
      if (session.watchers.size === 0) {
        this.stopMatch(matchId);
      }
    }
    
    socket.leave(`match-${matchId}`);
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: Socket): void {
    // Remove from all active matches
    const matchIds = Array.from(this.activeSessions.keys());
    for (const matchId of matchIds) {
      const session = this.activeSessions.get(matchId);
      if (session && session.watchers.has(socket.id)) {
        session.watchers.delete(socket.id);
        console.log(`[RealtimeMatch] Removed disconnected client from match ${matchId}`);
        
        // Clean up if no watchers
        if (session.watchers.size === 0) {
          this.stopMatch(matchId);
        }
      }
    }
  }

  /**
   * Start a new match simulation
   */
  private async startMatch(matchId: number, saveGameId: number, userId: number): Promise<void> {
    if (this.activeSessions.has(matchId)) {
      throw new Error(`Match ${matchId} is already running`);
    }

    // Initialize match engine for real-time
    const engine = new MatchEngine(this.storage);
    await engine.initializeRealTimeMatch(saveGameId, userId, matchId);

    // Create session
    const session: MatchSession = {
      matchId,
      saveGameId,
      userId,
      engine,
      speed: 1,
      isPaused: false,
      currentTick: 0,
      timer: null,
      watchers: new Set()
    };

    this.activeSessions.set(matchId, session);

    // Start simulation loop
    this.runSimulationTick(matchId);
    
    console.log(`[RealtimeMatch] Match ${matchId} started`);
  }

  /**
   * Stop a match simulation
   */
  private stopMatch(matchId: number): void {
    const session = this.activeSessions.get(matchId);
    if (session) {
      if (session.timer) {
        clearTimeout(session.timer);
      }
      this.activeSessions.delete(matchId);
      console.log(`[RealtimeMatch] Match ${matchId} stopped`);
    }
  }

  /**
   * Run a single simulation tick
   */
  private runSimulationTick(matchId: number): void {
    const session = this.activeSessions.get(matchId);
    if (!session) return;

    // Check if match is complete (160 ticks = 40 minutes)
    if (session.currentTick >= 160) {
      this.completeMatch(matchId);
      return;
    }

    // 1. Process tick (generate events, update state)
    session.engine.processTick();
    const state = session.engine.getState();
    session.currentTick++;

    // 2. IMMEDIATELY broadcast update (no delay)
    const update = this.createMatchUpdate(state, session.currentTick);
    this.io.to(`match-${matchId}`).emit('match:update', update);

    // 3. Schedule next tick (if not paused)
    if (!session.isPaused) {
      const tickInterval = this.calculateTickInterval(session.speed);
      session.timer = setTimeout(() => {
        this.runSimulationTick(matchId);
      }, tickInterval);
    }
  }

  /**
   * Complete a match and save final state
   */
  private async completeMatch(matchId: number): Promise<void> {
    const session = this.activeSessions.get(matchId);
    if (!session) return;

    const state = session.engine.getState();
    console.log(`[RealtimeMatch] Match ${matchId} completed: ${state.score.home}-${state.score.away}`);

    // Finalize and save match through engine
    const savedMatch = await session.engine.finalizeRealTimeMatch();

    // Update competition standings
    await this.competitionEngine.updateStandings(
      savedMatch.competitionId, 
      savedMatch, 
      state.saveGameId, 
      state.userId
    );

    // Create inbox message with match result
    await this.storage.createInboxMessage(state.saveGameId, state.userId, {
      category: "match",
      subject: `Match Result: ${savedMatch.homeScore} - ${savedMatch.awayScore}`,
      body: `Your match has been completed.\n\nFinal Score\n  ${savedMatch.homeScore} - ${savedMatch.awayScore} \n\nCheck the match details for full statistics.`,
      from: "Match Officials",
      date: savedMatch.date,
      read: false,
      starred: false,
      priority: "high",
      actionLink: `/matches/${matchId}`,
    });

    // Broadcast final state
    const finalUpdate = this.createMatchUpdate(state, session.currentTick);
    this.io.to(`match-${matchId}`).emit('match:complete', {
      ...finalUpdate,
      match: savedMatch
    });

    // Clean up session
    this.stopMatch(matchId);
  }

  /**
   * Handle user actions during match
   */
  private async handleMatchAction(
    socket: Socket, 
    matchId: number, 
    action: MatchAction
  ): Promise<void> {
    const session = this.activeSessions.get(matchId);
    if (!session) {
      throw new Error(`Match ${matchId} not found`);
    }

    console.log(`[RealtimeMatch] Processing action type: ${action.type}`);

    // Rate limiting check (max 1 action per second per socket)
    // TODO: Implement rate limiting

    switch (action.type) {
      case 'substitute':
        console.log(`[RealtimeMatch] Applying substitution: team=${action.team}, out=${action.playerOutId}, in=${action.playerInId}`);
        session.engine.applySubstitution(action.team, action.playerOutId, action.playerInId);
        break;
      
      case 'change-formation':
        console.log(`[RealtimeMatch] Changing formation: team=${action.team}, formation=${action.formation}`);
        session.engine.changeFormation(action.team, action.formation);
        break;
      
      case 'change-tactics':
        console.log(`[RealtimeMatch] Changing tactics: team=${action.team}`, action.tactics);
        session.engine.changeTactics(action.team, action.tactics);
        break;
      
      case 'pause':
        console.log(`[RealtimeMatch] Pausing match`);
        this.handlePause(session);
        break;
      
      case 'resume':
        console.log(`[RealtimeMatch] Resuming match`);
        this.handleResume(session);
        break;
      
      case 'speed':
        console.log(`[RealtimeMatch] Changing speed to ${action.speed}x`);
        this.handleSpeedChange(session, action.speed);
        break;
    }

    // Broadcast updated state
    const state = session.engine.getState();
    const update = this.createMatchUpdate(state, session.currentTick);
    this.io.to(`match-${matchId}`).emit('match:update', update);
  }

  /**
   * Handle pause
   */
  private handlePause(session: MatchSession): void {
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = null;
    }
    session.isPaused = true;
    console.log(`[RealtimeMatch] Match ${session.matchId} paused at tick ${session.currentTick}`);
  }

  /**
   * Handle resume
   */
  private handleResume(session: MatchSession): void {
    if (session.isPaused) {
      session.isPaused = false;
      console.log(`[RealtimeMatch] Match ${session.matchId} resumed at tick ${session.currentTick}`);
      // Resume simulation loop
      this.runSimulationTick(session.matchId);
    }
  }

  /**
   * Handle speed change
   */
  private handleSpeedChange(session: MatchSession, speed: 1 | 2 | 4): void {
    const oldSpeed = session.speed;
    session.speed = speed;
    
    // If running, restart timer with new interval
    if (!session.isPaused && session.timer) {
      clearTimeout(session.timer);
      const tickInterval = this.calculateTickInterval(speed);
      session.timer = setTimeout(() => {
        this.runSimulationTick(session.matchId);
      }, tickInterval);
    }
    
    console.log(`[RealtimeMatch] Match ${session.matchId} speed changed: ${oldSpeed}x → ${speed}x`);
  }

  /**
   * Calculate tick interval based on speed
   */
  private calculateTickInterval(speed: 1 | 2 | 4): number {
    return this.BASE_TICK_INTERVAL * this.SPEED_MULTIPLIERS[speed];
  }

  /**
   * Create match update message
   */
  private createMatchUpdate(state: LiveMatchState, tickNumber: number): MatchUpdate {
    // Determine momentum trend
    let momentumTrend: 'home' | 'away' | 'neutral' = 'neutral';
    if (state.momentum.value > 55) momentumTrend = 'home';
    else if (state.momentum.value < 45) momentumTrend = 'away';

    return {
      minute: state.currentMinute,
      second: Math.floor((state.currentTick % 4) * 15),
      score: state.score,
      events: state.events,
      statistics: state.statistics,
      momentum: {
        value: state.momentum.value,
        trend: momentumTrend
      },
      lineups: {
        home: state.homeLineup,
        away: state.awayLineup
      },
      tactics: {
        home: state.homeTactics,
        away: state.awayTactics
      },
      suspendedPlayers: {
        home: state.suspendedPlayers.home,
        away: state.suspendedPlayers.away
      },
      tickNumber
    };
  }

  /**
   * Get active match count
   */
  public getActiveMatchCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get match session info
   */
  public getMatchInfo(matchId: number): { watchers: number; tick: number; speed: number } | null {
    const session = this.activeSessions.get(matchId);
    if (!session) return null;

    return {
      watchers: session.watchers.size,
      tick: session.currentTick,
      speed: session.speed
    };
  }
}
