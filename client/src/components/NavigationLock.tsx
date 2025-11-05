import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NavigationLockProps {
  locked: boolean;
  children: ReactNode;
  showTooltip?: boolean;
  tooltipMessage?: string;
  className?: string;
}

/**
 * Navigation Lock Component
 * Prevents user interaction and navigation during time advancement
 * Shows visual feedback that actions are disabled
 */
export function NavigationLock({
  locked,
  children,
  showTooltip = true,
  tooltipMessage = "Cannot navigate while time is advancing",
  className,
}: NavigationLockProps) {
  // If not locked, render children normally
  if (!locked) {
    return <>{children}</>;
  }

  // Locked state - wrap with disabled overlay
  const content = (
    <div className={cn("relative", className)}>
      {/* Dimmed content */}
      <div className="pointer-events-none opacity-50 select-none">
        {children}
      </div>
      
      {/* Invisible overlay to capture clicks */}
      <div
        className="absolute inset-0 cursor-not-allowed z-10"
        aria-label={tooltipMessage}
      />
    </div>
  );

  // With tooltip
  if (showTooltip) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="text-sm font-medium">{tooltipMessage}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Wait for time advancement to complete or stop it to continue.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Without tooltip
  return content;
}

/**
 * Navigation Lock for specific interactive elements
 * Use this for buttons, links, inputs, etc.
 */
interface InteractiveLockProps {
  locked: boolean;
  children: ReactNode;
  as?: "button" | "a" | "div";
  onClick?: () => void;
  className?: string;
}

export function InteractiveLock({
  locked,
  children,
  as: Component = "div",
  onClick,
  className,
}: InteractiveLockProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (locked) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    if (onClick) {
      onClick();
    }
  };

  return (
    <Component
      onClick={handleClick}
      className={cn(
        locked && "cursor-not-allowed opacity-50",
        "transition-opacity duration-200",
        className
      )}
      aria-disabled={locked}
    >
      {children}
    </Component>
  );
}
