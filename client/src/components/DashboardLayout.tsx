import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, Users, Zap, GraduationCap, TrendingUp, Trophy,
  Mail, DollarSign, Building, Calendar, Settings2, LogOut, Save, Moon,
  HandCoins
} from "lucide-react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { useAdvancementStore } from "@/lib/stores/advancementStore";
import { useAuth } from "@/lib/stores/useAuth";
import { NavigationLock } from "@/components/NavigationLock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location, setLocation] = useLocation();
  const { unreadInboxCount } = useFutsalManager();
  const { isAdvancing } = useAdvancementStore();
  const { logout, setActiveSaveGame } = useAuth();

  const handleLoadSave = () => {
    setActiveSaveGame(null);
  };

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/inbox", label: "Inbox", icon: Mail, badge: unreadInboxCount },
    { path: "/squad", label: "Squad", icon: Users },
    { path: "/tactics", label: "Tactics", icon: Zap },
    { path: "/competitions", label: "Competitions", icon: Trophy },
    { path: "/matches", label: "Matches", icon: Calendar },
    { path: "/training", label: "Training", icon: GraduationCap },
    { path: "/transfers", label: "Transfers", icon: HandCoins },

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
          <div className="p-4 border-b border-border flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Futsal Manager"
              className="w-32 h-32 object-contain"
            />
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
      <main className="flex-1 overflow-y-auto relative">
        {/* Global Settings Menu */}
        <div className="absolute top-4 right-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full shadow-md">
                <Settings2 className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Settings2 className="mr-2 h-4 w-4" />
                <span>Preferences</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">TBI</Badge>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark Mode</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">TBI</Badge>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLoadSave}>
                <Save className="mr-2 h-4 w-4" />
                <span>Load Save</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
