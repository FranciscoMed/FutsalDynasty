import { Formation } from "@/lib/formations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Zap } from "lucide-react";

interface TacticsControlsProps {
  formation: Formation;
  onFormationChange: (formation: Formation) => void;
  onQuickFill: () => void;
  onInstructionsClick: () => void;
}

export function TacticsControls({
  formation,
  onFormationChange,
  onQuickFill,
  onInstructionsClick,
}: TacticsControlsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={formation} onValueChange={onFormationChange}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="4-0">4-0</SelectItem>
          <SelectItem value="3-1">3-1</SelectItem>
          <SelectItem value="2-2">2-2</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={onInstructionsClick}
        className="flex items-center gap-1"
      >
        <Settings className="w-3 h-3" />
        Instructions
        <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
          TBI
        </Badge>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onQuickFill}
        className="flex items-center gap-1 bg-[#2D6A4F] text-white hover:bg-[#1B4332] hover:text-white"
      >
        <Zap className="w-3 h-3" />
        Quick Fill
      </Button>
    </div>
  );
}
