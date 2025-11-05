import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, Users, Zap, GraduationCap, TrendingUp, Trophy, 
  Mail, DollarSign, Building, Calendar 
} from "lucide-react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { useAdvancementStore } from "@/lib/stores/advancementStore";
import { NavigationLock } from "@/components/NavigationLock";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { unreadInboxCount } = useFutsalManager();
  const { isAdvancing } = useAdvancementStore();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/squad", label: "Squad", icon: Users },
    { path: "/tactics", label: "Tactics", icon: Zap },
    { path: "/matches", label: "Matches", icon: Calendar },
    { path: "/training", label: "Training", icon: GraduationCap },
    { path: "/transfers", label: "Transfers", icon: TrendingUp },
    { path: "/competitions", label: "Competitions", icon: Trophy },
    { path: "/inbox", label: "Inbox", icon: Mail, badge: unreadInboxCount },
    { path: "/finances", label: "Finances", icon: DollarSign },
    { path: "/club", label: "Club", icon: Building },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar with Navigation Lock */}
      <NavigationLock
        locked={isAdvancing}
        tooltipMessage="Cannot navigate while time is advancing"
      >
        <aside className="w-64 bg-card border-r border-border flex flex-col">
          <div className="p-6 border-b border-border">
            <h1 className="text-2xl font-bold text-primary">Futsal Manager</h1>
          </div>
          
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <li key={item.path}>
                    <Link href={item.path}>
                      <div
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <Badge className="bg-success text-white">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              <p>Season 2024/25</p>
              <p>August 2024</p>
            </div>
          </div>
        </aside>
      </NavigationLock>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
