import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { 
  LiveMatchState, 
  OnCourtPlayer, 
  TacticalSetup,
  MatchEvent 
} from '../../../shared/schema';

/**
 * Match update from server
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
    away: OnCourtPlayer[];
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
 * Match completion event
 */
export interface MatchComplete extends MatchUpdate {
  match: {
    id: number;
    homeScore: number;
    awayScore: number;
    homeStats: any;
    awayStats: any;
    events: MatchEvent[];
  };
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
 * Connection status
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Hook state
 */
interface UseMatchWebSocketState {
  matchUpdate: MatchUpdate | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  error: string | null;
  speed: 1 | 2 | 4;
  isPaused: boolean;
}

/**
 * Hook return type
 */
interface UseMatchWebSocketReturn extends UseMatchWebSocketState {
  sendAction: (action: MatchAction) => void;
  reconnect: () => void;
}

/**
 * Custom hook for real-time match WebSocket connection
 * 
 * @param matchId - The match ID to stream
 * @param saveGameId - The save game ID
 * @param userId - The user ID
 * @param enabled - Whether to enable the connection (default: true)
 * @returns Match state and control functions
 * 
 * @example
 * ```tsx
 * const { matchUpdate, isConnected, sendAction } = useMatchWebSocket(
 *   match.id,
 *   saveGameId,
 *   userId
 * );
 * 
 * // Subscribe a player
 * sendAction({
 *   type: 'substitute',
 *   team: 'home',
 *   playerOutId: 5,
 *   playerInId: 12
 * });
 * 
 * // Change speed
 * sendAction({ type: 'speed', speed: 2 });
 * ```
 */
export function useMatchWebSocket(
  matchId: number,
  saveGameId: number,
  userId: number,
  enabled: boolean = true
): UseMatchWebSocketReturn {
  const [state, setState] = useState<UseMatchWebSocketState>({
    matchUpdate: null,
    isConnected: false,
    connectionStatus: 'connecting',
    error: null,
    speed: 1,
    isPaused: false
  });

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!enabled || socketRef.current) return;

    setState(prev => ({ ...prev, connectionStatus: 'connecting', error: null }));

    // Create socket connection
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketRef.current = socket;

    // Connection established
    socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setState(prev => ({ 
        ...prev, 
        isConnected: true, 
        connectionStatus: 'connected',
        error: null 
      }));

      // Join match room
      socket.emit('join-match', { matchId, saveGameId, userId });
    });

    // Successfully joined match
    socket.on('match:joined', (data: { 
      matchId: number; 
      state: MatchUpdate; 
      speed: 1 | 2 | 4; 
      isPaused: boolean 
    }) => {
      console.log('[WebSocket] Joined match:', data.matchId);
      setState(prev => ({
        ...prev,
        matchUpdate: data.state,
        speed: data.speed,
        isPaused: data.isPaused
      }));
    });

    // Match state updates
    socket.on('match:update', (update: MatchUpdate) => {
      setState(prev => ({ ...prev, matchUpdate: update }));
    });

    // Match completed
    socket.on('match:complete', (data: MatchComplete) => {
      console.log('[WebSocket] Match complete:', data.match.homeScore, '-', data.match.awayScore);
      setState(prev => ({ 
        ...prev, 
        matchUpdate: data,
        isPaused: true
      }));
    });

    // Error from server
    socket.on('match:error', (error: { message: string; error?: string }) => {
      console.error('[WebSocket] Match error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'An error occurred',
        connectionStatus: 'error'
      }));
    });

    // Disconnection
    socket.on('disconnect', (reason: string) => {
      console.log('[WebSocket] Disconnected:', reason);
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        connectionStatus: 'disconnected' 
      }));

      // Auto-reconnect on unexpected disconnect
      if (reason === 'io server disconnect') {
        // Server forced disconnect - don't reconnect
        return;
      }

      // Try to reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[WebSocket] Attempting reconnect...');
        socket.connect();
      }, 2000);
    });

    // Connection error
    socket.on('connect_error', (error: Error) => {
      console.error('[WebSocket] Connection error:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to connect to server',
        connectionStatus: 'error'
      }));
    });
  }, [matchId, saveGameId, userId, enabled]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('leave-match', matchId);
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      isConnected: false, 
      connectionStatus: 'disconnected' 
    }));
  }, [matchId]);

  /**
   * Send action to server
   */
  const sendAction = useCallback((action: MatchAction) => {
    console.log('[WebSocket] sendAction called:', { action, isConnected: state.isConnected, hasSocket: !!socketRef.current });
    
    if (!socketRef.current || !state.isConnected) {
      console.warn('[WebSocket] Cannot send action: not connected', {
        hasSocket: !!socketRef.current,
        isConnected: state.isConnected
      });
      return;
    }

    // Update local state immediately for UI responsiveness
    if (action.type === 'speed') {
      setState(prev => ({ ...prev, speed: action.speed }));
    } else if (action.type === 'pause') {
      setState(prev => ({ ...prev, isPaused: true }));
    } else if (action.type === 'resume') {
      setState(prev => ({ ...prev, isPaused: false }));
    }

    // Send to server
    console.log('[WebSocket] Emitting match:action to server');
    socketRef.current.emit('match:action', { matchId, action });
  }, [matchId, state.isConnected]);

  /**
   * Manual reconnect
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 500);
  }, [connect, disconnect]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    ...state,
    sendAction,
    reconnect
  };
}
