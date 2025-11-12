import { Formation } from "@/lib/formations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import type { ReactNode } from "react";

interface TacticsControlsProps {
  formation: Formation;
  onFormationChange: (formation: Formation) => void;
  onQuickFill: () => void;
  children?: ReactNode;
}

export function TacticsControls({
  formation,
  onFormationChange,
  onQuickFill,
  children,
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

      {children}

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
