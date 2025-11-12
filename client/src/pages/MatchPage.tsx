import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useMatchWebSocket, type MatchUpdate } from '../hooks/useMatchWebSocket';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/stores/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompactPlayerCard } from '@/components/match/CompactPlayerCard';
import { CompactEventCard } from '@/components/match/CompactEventCard';
import { SubstitutionPanel } from '@/components/match/SubstitutionPanel';
import { 
  Play, 
  Pause, 
  Settings, 
  Zap,
  Clock,
  Target,
  Activity,
  TrendingUp,
  Users,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Swords
} from 'lucide-react';

interface MatchPageProps {}

export default function MatchPage({}: MatchPageProps) {
  const { matchId } = useParams<{ matchId: string }>();
  const [, setLocation] = useLocation();
  const { user, activeSaveGame } = useAuth();
  
  // Get saveGameId and userId from auth store
  const saveGameId = activeSaveGame?.id ?? 0;
  const userId = user?.id ?? 0;

  // Pre-match state
  const [matchStarted, setMatchStarted] = useState(false);
  
  // Tactics dialog state with pending changes
  const [tacticsOpen, setTacticsOpen] = useState(false);
  const [pendingMentality, setPendingMentality] = useState<string | null>(null);
  const [pendingPressing, setPendingPressing] = useState<string | null>(null);
  const [pendingWidth, setPendingWidth] = useState<string | null>(null);
  const [pendingFlyGK, setPendingFlyGK] = useState<'Never' | 'Sometimes' | 'Always' | null>(null);

  // Track if game was manually paused (to avoid auto-resuming when dialog closes)
  const [wasManuallyPaused, setWasManuallyPaused] = useState(false);

  // WebSocket connection - only connect after match starts
  const {
    matchUpdate,
    isConnected,
    connectionStatus,
    error: wsError,
    speed,
    isPaused,
    sendAction,
    reconnect
  } = useMatchWebSocket(
    Number(matchId),
    saveGameId,
    userId,
    matchStarted // Only enable connection after match starts
  );

  // Load match metadata
  const { data: matchMetadata } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      const response = await fetch(`/api/matches/${matchId}/preparation`);
      if (!response.ok) throw new Error('Failed to load match');
      const data = await response.json();
      
      // Debug: Log match metadata when loaded
      console.log('[MatchPage] Match Metadata Loaded:', {
        matchId,
        isHome: data.isHome,
        playerTeam: data.playerTeam,
        playerTeamFormation: data.playerTeam?.formation,
        playerTeamTactics: data.playerTeam?.tactics,
        match: data.match,
      });
      
      return data;
    }
  });

  // Determine which team is the user's
  const isUserHomeTeam = matchMetadata?.isHome ?? true;

  // Handle start match
  const handleStartMatch = () => {
    setMatchStarted(true);
  };

  // Detect match completion and navigate to post-match screen
  useEffect(() => {
    if (matchUpdate && matchUpdate.minute >= 40 && isPaused) {
      // Match is complete (40 minutes = full time)
      const timer = setTimeout(() => {
        setLocation(`/match/${matchId}/post-match`);
      }, 3000); // Wait 3 seconds before navigating

      return () => clearTimeout(timer);
    }
  }, [matchUpdate, isPaused, matchId, setLocation]);

  // Auto-pause when tactics or substitution dialog opens
  useEffect(() => {
    if (!matchStarted || !isConnected) return;

    if (tacticsOpen && !isPaused) {
      // Dialog opened and game is running - pause it
      console.log('[MatchPage] Dialog opened, auto-pausing game');
      sendAction({ type: 'pause' });
      setWasManuallyPaused(false); // This is an auto-pause, not manual
    }
    // Auto-resume is handled in dialog close handlers, not here
  }, [tacticsOpen, isPaused, isConnected, matchStarted, sendAction]);

  // Handle speed change
  const handleSpeedChange = (newSpeed: 1 | 2 | 4) => {
    sendAction({ type: 'speed', speed: newSpeed });
  };

  // Handle pause/resume
  const handlePauseToggle = () => {
    if (isPaused) {
      sendAction({ type: 'resume' });
      setWasManuallyPaused(false);
    } else {
      sendAction({ type: 'pause' });
      setWasManuallyPaused(true); // User manually paused
    }
  };

  // Handle substitution
  const handleSubstitute = (outPlayerId: number, inPlayerId: number) => {
    const team = isUserHomeTeam ? 'home' : 'away';
    console.log('[MatchPage] Substituting:', { team, out: outPlayerId, in: inPlayerId });
    sendAction({ 
      type: 'substitute', 
      team, 
      playerOutId: outPlayerId, 
      playerInId: inPlayerId 
    });
  };

  // Handle tactics - save pending changes
  const handleSaveTactics = () => {
    const team = isUserHomeTeam ? 'home' : 'away';
    const tactics: any = {};
    
    if (pendingMentality) tactics.mentality = pendingMentality;
    if (pendingPressing) tactics.pressingIntensity = pendingPressing;
    if (pendingWidth) tactics.width = pendingWidth;
    if (pendingFlyGK !== null) {
      tactics.flyGoalkeeper = { usage: pendingFlyGK };
    }

    console.log('[MatchPage] Saving tactics:', { team, tactics, isConnected });

    if (Object.keys(tactics).length > 0) {
      sendAction({ type: 'change-tactics', team, tactics });
      console.log('[MatchPage] Sent change-tactics action');
    } else {
      console.log('[MatchPage] No tactics changes to send');
    }

    // Clear pending changes and close dialog
    setPendingMentality(null);
    setPendingPressing(null);
    setPendingWidth(null);
    setPendingFlyGK(null);
    setTacticsOpen(false);

    // Auto-resume if game was auto-paused (not manually paused)
    if (isPaused && !wasManuallyPaused) {
      console.log('[MatchPage] Dialog closed, auto-resuming game');
      sendAction({ type: 'resume' });
    }
  };

  // Handle tactics dialog close (cancel or X button)
  const handleTacticsDialogClose = (open: boolean) => {
    setTacticsOpen(open);
    
    // If closing the dialog (open = false) and game was auto-paused, resume it
    if (!open && isPaused && !wasManuallyPaused) {
      console.log('[MatchPage] Tactics dialog closed (cancelled), auto-resuming game');
      sendAction({ type: 'resume' });
    }
    
    // Clear pending changes if cancelled
    if (!open) {
      setPendingMentality(null);
      setPendingPressing(null);
      setPendingWidth(null);
      setPendingFlyGK(null);
    }
  };

  // Get event icon
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'goal': return '⚽';
      case 'shot': return '🥅';
      case 'tackle': return '🛡️';
      case 'foul': return '⚠️';
      case 'yellow_card': return '🟨';
      case 'red_card': return '🟥';
      case 'substitution': return '🔄';
      case 'corner': return '📐';
      case 'block': return '🚫';
      case 'interception': return '✋';
      case 'dribble': return '🏃';
      default: return '📝';
    }
  };

  // Get event style
  const getEventStyle = (type: string) => {
    switch (type) {
      case 'goal': return 'border-l-4 border-green-500 bg-green-50';
      case 'yellow_card':
      case 'foul': return 'border-l-4 border-yellow-500 bg-yellow-50';
      case 'red_card': return 'border-l-4 border-red-500 bg-red-50';
      default: return 'border-l-4 border-amber-500 bg-amber-50';
    }
  };

  // Calculate momentum percentage
  const momentumPercentage = matchUpdate 
    ? matchUpdate.momentum.value 
    : 50;

  // Get momentum gradient
  const getMomentumGradient = () => {
    if (momentumPercentage > 60) return 'from-amber-600 to-green-600';
    if (momentumPercentage < 40) return 'from-red-600 to-amber-600';
    return 'from-amber-500 to-amber-600';
  };

  // Show pre-match screen if match hasn't started
  if (!matchStarted) {
    if (!matchMetadata) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Activity className="w-12 h-12 animate-spin mx-auto text-amber-600" />
            <p className="text-lg font-semibold">Loading match data...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto p-4 max-w-[1200px]">
        <Card className="p-8">
          <div className="text-center space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{matchMetadata.match.competitionName}</h1>
              <p className="text-muted-foreground">Match Day Preparation</p>
            </div>

            {/* Team Names */}
            <div className="flex items-center justify-center gap-8 py-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold">{matchMetadata.match.homeTeamName}</h2>
                {matchMetadata.isHome && (
                  <Badge className="mt-2 bg-amber-600">Your Team</Badge>
                )}
              </div>
              <div className="text-4xl font-bold text-muted-foreground">VS</div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">{matchMetadata.match.awayTeamName}</h2>
                {!matchMetadata.isHome && (
                  <Badge className="mt-2 bg-amber-600">Your Team</Badge>
                )}
              </div>
            </div>

            {/* Match Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground mb-1">Venue</p>
                <p className="font-semibold">{matchMetadata.venue}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground mb-1">Date</p>
                <p className="font-semibold">{new Date(matchMetadata.match.date).toLocaleDateString()}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground mb-1">Match Type</p>
                <p className="font-semibold">{matchMetadata.isHome ? 'Home' : 'Away'}</p>
              </div>
            </div>

            {/* Start Match Button */}
            <div className="pt-6">
              <Button
                size="lg"
                onClick={handleStartMatch}
                className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-6 text-lg"
              >
                <Play className="w-6 h-6 mr-2" />
                Start Match
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                The match will begin in real-time once you click Start Match
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Show loading screen while connecting to WebSocket
  if (!matchUpdate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Activity className="w-12 h-12 animate-spin mx-auto text-amber-600" />
          <p className="text-lg font-semibold">Connecting to match...</p>
          {wsError && (
            <div className="space-y-2">
              <p className="text-sm text-red-600">{wsError}</p>
              <Button onClick={reconnect} variant="outline">
                Reconnect
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const homeLineup = matchUpdate.lineups.home;
  const awayLineup = matchUpdate.lineups.away;
  const stats = matchUpdate.statistics;
  const userLineup = isUserHomeTeam ? homeLineup : awayLineup;
  const homeTeamName = matchMetadata?.match?.homeTeamName || 'Home Team';
  const awayTeamName = matchMetadata?.match?.awayTeamName || 'Away Team';
  
  // Get current tactics from match state (not from matchMetadata which is stale)
  const currentUserTactics = isUserHomeTeam ? matchUpdate.tactics.home : matchUpdate.tactics.away;

  // Transform squad data to match SubstitutionPanel expected format
  const transformedSquad = matchMetadata?.playerTeam?.squad?.map((player: any) => ({
    player: {
      id: player.id,
      name: player.name,
      position: player.position,
      energy: player.energy || 100,
      currentAbility: player.currentAbility,
    },
    performance: {
      rating: 7.0,
    }
  })) || [];
  
  // Debug: Log tactics information and squad data
  console.log('[MatchPage] Tactics Debug:', {
    isUserHomeTeam,
    currentUserTactics,
    homeTactics: matchUpdate.tactics.home,
    awayTactics: matchUpdate.tactics.away,
    matchMetadataFormation: matchMetadata?.playerTeam?.formation,
    matchMetadataTactics: matchMetadata?.playerTeam?.tactics,
  });

  console.log('[MatchPage] Squad Debug:', {
    rawSquad: matchMetadata?.playerTeam?.squad,
    transformedSquad,
    homeLineupIds: homeLineup.map(p => p.player.id),
    awayLineupIds: awayLineup.map(p => p.player.id),
  });

  // Calculate fouls for current half (resets at halftime - minute 20)
  const homeTeamId = matchMetadata?.match?.homeTeamId;
  const awayTeamId = matchMetadata?.match?.awayTeamId;
  
  const currentHalfFouls = {
    home: 0,
    away: 0
  };
  
  // Count fouls from events in the current half
  const currentHalfStartMinute = matchUpdate.minute <= 20 ? 0 : 20;
  matchUpdate.events.forEach(event => {
    if (event.type === 'foul' && event.minute >= currentHalfStartMinute) {
      if (event.teamId === homeTeamId) {
        currentHalfFouls.home++;
      } else if (event.teamId === awayTeamId) {
        currentHalfFouls.away++;
      }
    }
  });

  return (
    <div className="container mx-auto p-4 max-w-[1600px] h-screen flex flex-col overflow-hidden">
      {/* Connection Status Banner */}
      {!isConnected && (
        <Card className="p-4 bg-red-50 border-red-200 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-red-900">Disconnected from match server</span>
            </div>
            <Button onClick={reconnect} size="sm" variant="destructive">
              Reconnect
            </Button>
          </div>
        </Card>
      )}

      {/* Scoreboard Header */}
      <Card className="p-6 mb-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-8">
          {/* Home Team */}
          <div className="flex-1 text-center">
            <h2 className="text-lg font-semibold mb-2">{homeTeamName}</h2>
            <div className="text-5xl font-bold text-amber-700">
              {matchUpdate.score.home}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                {currentHalfFouls.home} {currentHalfFouls.home === 1 ? 'Foul' : 'Fouls'}
              </span>
            </div>
          </div>

          {/* Match Time */}
          <div className="flex flex-col items-center gap-2 px-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                {matchUpdate.minute}:{String(matchUpdate.second).padStart(2, '0')}'
              </span>
            </div>
            <Badge variant="outline" className="text-sm">
              {matchUpdate.minute <= 20 ? '1st Half' : '2nd Half'}
            </Badge>
            
            {/* Match Controls */}
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                variant={isPaused ? 'default' : 'outline'}
                onClick={handlePauseToggle}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              
              <div className="flex gap-1">
                {[1, 2, 4].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={speed === s ? 'default' : 'outline'}
                    onClick={() => handleSpeedChange(s as 1 | 2 | 4)}
                    className="w-10"
                  >
                    {s}x
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex-1 text-center">
            <h2 className="text-lg font-semibold mb-2">{awayTeamName}</h2>
            <div className="text-5xl font-bold text-amber-700">
              {matchUpdate.score.away}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                {currentHalfFouls.away} {currentHalfFouls.away === 1 ? 'Foul' : 'Fouls'}
              </span>
            </div>
          </div>
        </div>

        {/* Momentum Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Home Momentum</span>
            <span>Away Momentum</span>
          </div>
          <div className="relative h-10 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`absolute h-full bg-gradient-to-r ${getMomentumGradient()} transition-all duration-500 flex items-center px-4 font-bold text-white text-sm`}
              style={{ width: `${momentumPercentage}%` }}
            >
              {momentumPercentage > 50 && `${momentumPercentage.toFixed(0)}%`}
            </div>
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white/50"
              style={{ left: '50%' }}
            />
            {momentumPercentage <= 50 && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-700 text-sm">
                {(100 - momentumPercentage).toFixed(0)}%
              </div>
            )}
          </div>
          <div className="text-center text-xs text-muted-foreground">
            {matchUpdate.momentum.trend === 'home' && 'Home team has momentum'}
            {matchUpdate.momentum.trend === 'away' && 'Away team has momentum'}
            {matchUpdate.momentum.trend === 'neutral' && 'Even match'}
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
        {/* Left Panel - Home Team */}
        <div className="lg:col-span-3 space-y-3 overflow-y-auto">
          <Card className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                {homeTeamName}
              </h3>
            </div>

            <div className="space-y-2">
              {homeLineup.slice(0, 5).map((player) => (
                <CompactPlayerCard 
                  key={player.player.id} 
                  player={player}
                  teamColor="amber"
                />
              ))}
            </div>
          </Card>

          {/* Tactics & Subs Button - Only for user's team */}
          {isUserHomeTeam && (
            <Dialog open={tacticsOpen} onOpenChange={handleTacticsDialogClose}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full" 
                  variant="outline"
                  size="lg"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Tactics & Subs
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Team Management</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="tactics" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tactics">Tactics</TabsTrigger>
                  <TabsTrigger value="substitutions">Substitutions</TabsTrigger>
                </TabsList>

                <TabsContent value="tactics" className="space-y-4">
                  {/* Current Formation Display */}
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Current Formation</div>
                    <div className="font-semibold text-lg">
                      {(() => {
                        // Prefer tactics.formation over team.formation (tactics.formation is the source of truth)
                        const formation = matchMetadata?.playerTeam?.tactics?.formation || matchMetadata?.playerTeam?.formation || '3-1';
                        console.log('[MatchPage] Formation Display (Home Team Dialog):', {
                          formation,
                          tacticsFormation: matchMetadata?.playerTeam?.tactics?.formation,
                          playerTeamFormation: matchMetadata?.playerTeam?.formation,
                          playerTeamData: matchMetadata?.playerTeam,
                        });
                        return formation;
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Formation cannot be changed during the match. Adjust tactical instructions below.
                    </p>
                  </div>
                  
                  <Tabs defaultValue="mentality" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="mentality">Mentality</TabsTrigger>
                  <TabsTrigger value="pressing">Pressing</TabsTrigger>
                  <TabsTrigger value="width">Width</TabsTrigger>
                  <TabsTrigger value="special">Special</TabsTrigger>
                </TabsList>

                <TabsContent value="mentality" className="space-y-2">
                  {['VeryDefensive', 'Defensive', 'Balanced', 'Attacking', 'VeryAttacking'].map((m) => {
                    const isSelected = pendingMentality ? pendingMentality === m : currentUserTactics.mentality === m;
                    return (
                      <Button
                        key={m}
                        variant={isSelected ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setPendingMentality(m)}
                      >
                        <Swords className="w-4 h-4 mr-2" />
                        {m.replace(/([A-Z])/g, ' $1').trim()}
                      </Button>
                    );
                  })}
                </TabsContent>

                <TabsContent value="pressing" className="space-y-2">
                  {['Low', 'Medium', 'High', 'VeryHigh'].map((p) => {
                    const isSelected = pendingPressing ? pendingPressing === p : currentUserTactics.pressingIntensity === p;
                    return (
                      <Button
                        key={p}
                        variant={isSelected ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setPendingPressing(p)}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        {p.replace(/([A-Z])/g, ' $1').trim()} Pressing
                      </Button>
                    );
                  })}
                </TabsContent>

                <TabsContent value="width" className="space-y-2">
                  {['Narrow', 'Balanced', 'Wide'].map((w) => {
                    const isSelected = pendingWidth ? pendingWidth === w : currentUserTactics.width === w;
                    return (
                      <Button
                        key={w}
                        variant={isSelected ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setPendingWidth(w)}
                      >
                        <ArrowLeftRight className="w-4 h-4 mr-2" />
                        {w} Width
                      </Button>
                    );
                  })}
                </TabsContent>

                <TabsContent value="special" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Fly Goalkeeper</h4>
                    <p className="text-sm text-muted-foreground">
                      Advanced outfield player acts as an extra attacker
                    </p>
                    <div className="space-y-2">
                      {(['Never', 'Sometimes', 'Always'] as const).map((option) => {
                        const isSelected = pendingFlyGK ? pendingFlyGK === option : currentUserTactics.flyGoalkeeper?.usage === option;
                        return (
                          <Button
                            key={option}
                            variant={isSelected ? "default" : "outline"}
                            className="w-full justify-start"
                            onClick={() => setPendingFlyGK(option)}
                          >
                            {option === 'Never' && <XCircle className="w-4 h-4 mr-2" />}
                            {option === 'Sometimes' && <Activity className="w-4 h-4 mr-2" />}
                            {option === 'Always' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                            {option}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Save Button for Tactics */}
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPendingMentality(null);
                    setPendingPressing(null);
                    setPendingWidth(null);
                    setPendingFlyGK(null);
                    setTacticsOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTactics}
                  disabled={!pendingMentality && !pendingPressing && !pendingWidth && pendingFlyGK === null}
                >
                  Save Tactics
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="substitutions" className="mt-4">
              <SubstitutionPanel
                lineup={homeLineup}
                allPlayers={transformedSquad}
                suspendedPlayerIds={matchUpdate?.suspendedPlayers?.home || []}
                onSubstitute={handleSubstitute}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Center Panel - Events & Stats */}
        <div className="lg:col-span-6 overflow-hidden">
          <Card className="p-3 h-[400px] flex flex-col">
            <Tabs defaultValue="events" className="flex flex-col flex-1">
              <TabsList className="grid w-full grid-cols-2 mb-3">
                <TabsTrigger value="events">Match Events</TabsTrigger>
                <TabsTrigger value="stats">Match Stats</TabsTrigger>
              </TabsList>
              
              <TabsContent value="events" className="flex-1 overflow-hidden mt-0">
                <div className="space-y-2 overflow-y-auto pr-2 h-full">
                  {matchUpdate.events.slice(-6).reverse().map((event, idx) => (
                    <CompactEventCard key={idx} event={event} />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="stats" className="flex-1 overflow-y-auto mt-0">
                <div className="grid grid-cols-2 gap-4">
                  {/* Possession */}
                  <StatCard
                    label="Possession"
                    home={stats.possession.home}
                    away={stats.possession.away}
                    isPercentage
                  />
                  
                  {/* Shots */}
                  <StatCard
                    label="Shots"
                    home={stats.shots.home}
                    away={stats.shots.away}
                  />
                  
                  {/* Shots on Target */}
                  <StatCard
                    label="On Target"
                    home={stats.shotsOnTarget.home}
                    away={stats.shotsOnTarget.away}
                  />
                  
                  {/* Fouls */}
                  <StatCard
                    label="Fouls"
                    home={stats.fouls.home}
                    away={stats.fouls.away}
                  />
                  
                  {/* Corners */}
                  <StatCard
                    label="Corners"
                    home={stats.corners.home}
                    away={stats.corners.away}
                  />
                  
                  {/* Saves */}
                  <StatCard
                    label="Saves"
                    home={stats.saves.home}
                    away={stats.saves.away}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Right Panel - Away Team */}
        <div className="lg:col-span-3 space-y-3 overflow-y-auto">
          <Card className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                {awayTeamName}
              </h3>
            </div>

            <div className="space-y-2">
              {awayLineup.slice(0, 5).map((player) => (
                <CompactPlayerCard 
                  key={player.player.id} 
                  player={player}
                  teamColor="red"
                />
              ))}
            </div>
          </Card>

          {!isUserHomeTeam && (
            <Dialog open={tacticsOpen} onOpenChange={handleTacticsDialogClose}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full" 
                  variant="outline"
                  size="lg"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Tactics & Subs
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Team Management</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="tactics" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tactics">Tactics</TabsTrigger>
                  <TabsTrigger value="substitutions">Substitutions</TabsTrigger>
                </TabsList>

                <TabsContent value="tactics" className="space-y-4">
                  {/* Current Formation Display */}
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Current Formation</div>
                    <div className="font-semibold text-lg">
                      {(() => {
                        // Prefer tactics.formation over team.formation (tactics.formation is the source of truth)
                        const formation = matchMetadata?.playerTeam?.tactics?.formation || matchMetadata?.playerTeam?.formation || '3-1';
                        console.log('[MatchPage] Formation Display (Away Team Dialog):', {
                          formation,
                          tacticsFormation: matchMetadata?.playerTeam?.tactics?.formation,
                          playerTeamFormation: matchMetadata?.playerTeam?.formation,
                        });
                        return formation;
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Formation cannot be changed during the match. Adjust tactical instructions below.
                    </p>
                  </div>
                  
                  <Tabs defaultValue="mentality" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="mentality">Mentality</TabsTrigger>
                  <TabsTrigger value="pressing">Pressing</TabsTrigger>
                  <TabsTrigger value="width">Width</TabsTrigger>
                  <TabsTrigger value="special">Special</TabsTrigger>
                </TabsList>

                <TabsContent value="mentality" className="space-y-2">
                  {['VeryDefensive', 'Defensive', 'Balanced', 'Attacking', 'VeryAttacking'].map((m) => {
                    const isSelected = pendingMentality ? pendingMentality === m : currentUserTactics.mentality === m;
                    return (
                      <Button
                        key={m}
                        variant={isSelected ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setPendingMentality(m)}
                      >
                        <Swords className="w-4 h-4 mr-2" />
                        {m.replace(/([A-Z])/g, ' $1').trim()}
                      </Button>
                    );
                  })}
                </TabsContent>

                <TabsContent value="pressing" className="space-y-2">
                  {['Low', 'Medium', 'High', 'VeryHigh'].map((p) => {
                    const isSelected = pendingPressing ? pendingPressing === p : currentUserTactics.pressingIntensity === p;
                    return (
                      <Button
                        key={p}
                        variant={isSelected ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setPendingPressing(p)}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        {p.replace(/([A-Z])/g, ' $1').trim()} Pressing
                      </Button>
                    );
                  })}
                </TabsContent>

                <TabsContent value="width" className="space-y-2">
                  {['Narrow', 'Balanced', 'Wide'].map((w) => {
                    const isSelected = pendingWidth ? pendingWidth === w : currentUserTactics.width === w;
                    return (
                      <Button
                        key={w}
                        variant={isSelected ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setPendingWidth(w)}
                      >
                        <ArrowLeftRight className="w-4 h-4 mr-2" />
                        {w} Width
                      </Button>
                    );
                  })}
                </TabsContent>

                <TabsContent value="special" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Fly Goalkeeper</h4>
                    <p className="text-sm text-muted-foreground">
                      Advanced outfield player acts as an extra attacker
                    </p>
                    <div className="space-y-2">
                      {(['Never', 'Sometimes', 'Always'] as const).map((option) => {
                        const isSelected = pendingFlyGK ? pendingFlyGK === option : currentUserTactics.flyGoalkeeper?.usage === option;
                        return (
                          <Button
                            key={option}
                            variant={isSelected ? "default" : "outline"}
                            className="w-full justify-start"
                            onClick={() => setPendingFlyGK(option)}
                          >
                            {option === 'Never' && <XCircle className="w-4 h-4 mr-2" />}
                            {option === 'Sometimes' && <Activity className="w-4 h-4 mr-2" />}
                            {option === 'Always' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                            {option}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Save Button for Tactics */}
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPendingMentality(null);
                    setPendingPressing(null);
                    setPendingWidth(null);
                    setPendingFlyGK(null);
                    setTacticsOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTactics}
                  disabled={!pendingMentality && !pendingPressing && !pendingWidth && pendingFlyGK === null}
                >
                  Save Tactics
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="substitutions" className="mt-4">
              <SubstitutionPanel
                lineup={awayLineup}
                allPlayers={transformedSquad}
                suspendedPlayerIds={matchUpdate?.suspendedPlayers?.away || []}
                onSubstitute={handleSubstitute}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
          </Dialog>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  home: number;
  away: number;
  isPercentage?: boolean;
}

function StatCard({ label, home, away, isPercentage }: StatCardProps) {
  const total = home + away;
  const homePercentage = total > 0 ? (home / total) * 100 : 50;
  
  // If it's possession, calculate percentage from total ticks
  const homeDisplay = isPercentage ? Math.round(homePercentage) : home;
  const awayDisplay = isPercentage ? Math.round(100 - homePercentage) : away;
  
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-center text-muted-foreground">
        {label}
      </div>
      <div className="flex justify-between items-center text-sm font-bold">
        <span>{isPercentage ? `${homeDisplay}%` : homeDisplay}</span>
        <span>{isPercentage ? `${awayDisplay}%` : awayDisplay}</span>
      </div>
      <Progress 
        value={homePercentage} 
        className="h-2"
      />
    </div>
  );
}
