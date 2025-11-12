import { Badge } from '@/components/ui/badge';

interface CompactEventCardProps {
  event: {
    type: string;
    minute: number;
    playerName: string;
    description: string;
    assistName?: string;
  };
}

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

const getEventStyle = (type: string) => {
  switch (type) {
    case 'goal': return 'bg-green-50 border-l-2 border-green-500';
    case 'yellow_card':
    case 'foul': return 'bg-yellow-50 border-l-2 border-yellow-500';
    case 'red_card': return 'bg-red-50 border-l-2 border-red-500';
    default: return 'bg-slate-50 border-l-2 border-amber-500';
  }
};

export function CompactEventCard({ event }: CompactEventCardProps) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${getEventStyle(event.type)}`}>
      <div className="text-lg shrink-0">{getEventIcon(event.type)}</div>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-sm">{event.playerName}</span>
        <span className="text-xs text-muted-foreground ml-2 truncate">
          {event.description}
        </span>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">
        {event.minute}'
      </Badge>
    </div>
  );
}
