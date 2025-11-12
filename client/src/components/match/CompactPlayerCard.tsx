import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface CompactPlayerCardProps {
  player: {
    player: {
      id: number;
      name: string;
      position: string;
      energy: number;
      currentAbility?: number;
    };
    performance: {
      rating: number;
    };
  };
  teamColor?: 'amber' | 'red';
}

export function CompactPlayerCard({ player, teamColor = 'amber' }: CompactPlayerCardProps) {
  const energyColor = player.player.energy < 30 
    ? 'text-red-600' 
    : player.player.energy < 60 
    ? 'text-yellow-600' 
    : 'text-green-600';

  const bgColor = teamColor === 'amber' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="p-2 bg-slate-50 rounded-lg flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full ${bgColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
        {player.player.position[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">
          {player.player.name}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>⭐ {player.performance.rating.toFixed(1)}</span>
          {player.player.currentAbility && (
            <span className="font-semibold">✨ {Math.round(player.player.currentAbility / 10)}</span>
          )}
        </div>
      </div>
      <div className="w-12 shrink-0">
        <Progress 
          value={player.player.energy} 
          className="h-1.5"
        />
        <div className={`text-[10px] font-semibold text-right mt-0.5 ${energyColor}`}>
          {Math.round(player.player.energy)}%
        </div>
      </div>
    </div>
  );
}
