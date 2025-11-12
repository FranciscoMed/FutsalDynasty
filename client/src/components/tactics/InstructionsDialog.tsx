import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Mentality = 'VeryDefensive' | 'Defensive' | 'Balanced' | 'Attacking' | 'VeryAttacking';
type PressingIntensity = 'Low' | 'Medium' | 'High' | 'VeryHigh';
type FlyGoalkeeperUsage = 'Never' | 'Sometimes' | 'Always';

interface TacticalInstructions {
  mentality: Mentality;
  pressingIntensity: PressingIntensity;
  flyGoalkeeper: FlyGoalkeeperUsage;
}

interface InstructionsDialogProps {
  initialInstructions?: Partial<TacticalInstructions>;
  onSave?: (instructions: TacticalInstructions) => void;
  disabled?: boolean;
  triggerButton?: React.ReactNode;
}

const MENTALITY_OPTIONS: { value: Mentality; label: string; description: string }[] = [
  { value: 'VeryDefensive', label: 'Very Defensive', description: 'Prioritize defense, minimal attacking' },
  { value: 'Defensive', label: 'Defensive', description: 'Cautious approach, counter-attacking' },
  { value: 'Balanced', label: 'Balanced', description: 'Equal focus on attack and defense' },
  { value: 'Attacking', label: 'Attacking', description: 'Aggressive, more players forward' },
  { value: 'VeryAttacking', label: 'Very Attacking', description: 'All-out attack, maximum pressure' },
];

const PRESSING_OPTIONS: { value: PressingIntensity; label: string; description: string }[] = [
  { value: 'Low', label: 'Low', description: 'Sit back, conserve energy' },
  { value: 'Medium', label: 'Medium', description: 'Moderate pressure on the ball' },
  { value: 'High', label: 'High', description: 'Active pressing in opponent half' },
  { value: 'VeryHigh', label: 'Very High', description: 'Constant high-intensity press' },
];

const FLY_GK_OPTIONS: { value: FlyGoalkeeperUsage; label: string; description: string }[] = [
  { value: 'Never', label: 'Never', description: 'Goalkeeper stays in goal' },
  { value: 'Sometimes', label: 'Sometimes', description: 'Tactical use when needed' },
  { value: 'Always', label: 'Always', description: 'Act as outfield player' },
];

export function InstructionsDialog({
  initialInstructions,
  onSave,
  disabled = false,
  triggerButton,
}: InstructionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [mentality, setMentality] = useState<Mentality>(
    initialInstructions?.mentality || 'Balanced'
  );
  const [pressingIntensity, setPressingIntensity] = useState<PressingIntensity>(
    initialInstructions?.pressingIntensity || 'Medium'
  );
  const [flyGoalkeeper, setFlyGoalkeeper] = useState<FlyGoalkeeperUsage>(
    initialInstructions?.flyGoalkeeper || 'Never'
  );

  // Update when initial values change
  useEffect(() => {
    if (initialInstructions?.mentality) setMentality(initialInstructions.mentality);
    if (initialInstructions?.pressingIntensity) setPressingIntensity(initialInstructions.pressingIntensity);
    if (initialInstructions?.flyGoalkeeper) setFlyGoalkeeper(initialInstructions.flyGoalkeeper);
  }, [initialInstructions]);

  const handleSave = () => {
    const instructions: TacticalInstructions = {
      mentality,
      pressingIntensity,
      flyGoalkeeper,
    };

    if (onSave) {
      onSave(instructions);
    }

    toast.success("Tactical instructions updated!");
    setOpen(false);
  };

  const handleCancel = () => {
    // Reset to initial values
    setMentality(initialInstructions?.mentality || 'Balanced');
    setPressingIntensity(initialInstructions?.pressingIntensity || 'Medium');
    setFlyGoalkeeper(initialInstructions?.flyGoalkeeper || 'Never');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" disabled={disabled}>
            <Settings className="w-4 h-4 mr-2" />
            Instructions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Tactical Instructions
          </DialogTitle>
          <DialogDescription>
            Configure your team's tactical approach and playing style
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mentality */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-semibold">Mentality</Label>
              <p className="text-sm text-muted-foreground mt-1">
                How aggressive or defensive your team plays
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {MENTALITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMentality(option.value)}
                  className={`
                    p-3 border rounded-lg text-left transition-all
                    ${mentality === option.value
                      ? 'border-secondary bg-secondary/10 ring-2 ring-secondary/20'
                      : 'border-border hover:border-secondary/50 hover:bg-accent'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                    {mentality === option.value && (
                      <Badge className="bg-primary">Selected</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Pressing Intensity */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-semibold">Pressing Intensity</Label>
              <p className="text-sm text-muted-foreground mt-1">
                How aggressively your team presses to win the ball back
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {PRESSING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPressingIntensity(option.value)}
                  className={`
                    p-3 border rounded-lg text-left transition-all
                    ${pressingIntensity === option.value
                      ? 'border-secondary bg-secondary/10 ring-2 ring-secondary/20'
                      : 'border-border hover:border-secondary/50 hover:bg-accent'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                    {pressingIntensity === option.value && (
                      <Badge className="bg-secondary">Selected</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Fly Goalkeeper */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-semibold">Fly Goalkeeper</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Whether your goalkeeper acts as an outfield player
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {FLY_GK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFlyGoalkeeper(option.value)}
                  className={`
                    p-3 border rounded-lg text-left transition-all
                    ${flyGoalkeeper === option.value
                      ? 'border-secondary bg-secondary/10 ring-2 ring-secondary/20'
                      : 'border-border hover:border-secondary/50 hover:bg-accent'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                    {flyGoalkeeper === option.value && (
                      <Badge className="bg-secondary">Selected</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/80">
            <Save className="w-4 h-4 mr-2" />
            Save Instructions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
