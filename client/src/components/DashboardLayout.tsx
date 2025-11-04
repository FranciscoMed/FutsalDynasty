import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, Users, Zap, GraduationCap, TrendingUp, Trophy, 
  Mail, DollarSign, Building, Bell 
} from "lucide-react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { unreadInboxCount } = useFutsalManager();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/squad", label: "Squad", icon: Users },
    { path: "/tactics", label: "Tactics", icon: Zap },
    { path: "/training", label: "Training", icon: GraduationCap },
    { path: "/transfers", label: "Transfers", icon: TrendingUp },
    { path: "/competitions", label: "Competitions", icon: Trophy },
    { path: "/inbox", label: "Inbox", icon: Mail, badge: unreadInboxCount },
    { path: "/finances", label: "Finances", icon: DollarSign },
    { path: "/club", label: "Club", icon: Building },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
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
                    <a
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
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
                    </a>
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

      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
