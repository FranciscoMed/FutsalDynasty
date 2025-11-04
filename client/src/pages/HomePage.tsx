import { useEffect } from "react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Mail, Calendar, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HomePage() {
  const { 
    playerTeam, 
    inboxMessages, 
    players,
    club,
    loadGameData,
    loading,
    initialized
  } = useFutsalManager();

  useEffect(() => {
    if (initialized) {
      loadGameData();
    }
  }, [initialized]);

  const recentMessages = inboxMessages.slice(0, 5);
  const squadCount = players.length;
  const averageAge = players.length > 0 
    ? Math.round(players.reduce((sum, p) => sum + p.age, 0) / players.length)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {playerTeam?.name || "FC United"}
        </h1>
        <p className="text-muted-foreground">
          Welcome back, Manager! Here's your overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Squad Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{squadCount}</div>
            <p className="text-xs text-muted-foreground">
              {squadCount >= 15 ? "Full squad" : `${15 - squadCount} slots available`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Age</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageAge}</div>
            <p className="text-xs text-muted-foreground">
              {averageAge < 24 ? "Young squad" : averageAge > 28 ? "Experienced squad" : "Balanced squad"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${club?.budget.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Available transfer funds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inboxMessages.filter(m => !m.read).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {inboxMessages.filter(m => !m.read).length === 0 ? "All caught up!" : "Needs attention"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No upcoming matches</p>
              <p className="text-sm mt-2">Season will start soon</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Recent Inbox
              </span>
              <Link href="/inbox">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No messages yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMessages.map((message) => (
                  <div
                    key={message.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {!message.read && (
                          <div className="w-2 h-2 rounded-full bg-success" />
                        )}
                        <p className="font-medium text-sm">{message.subject}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {message.from}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {message.category}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Board Objectives</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {club?.boardObjectives.map((objective, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="flex-1">
                  <p className="font-medium">{objective.description}</p>
                  <p className="text-sm text-muted-foreground">Target: {objective.target}</p>
                </div>
                <Badge variant={objective.completed ? "default" : "outline"}>
                  {objective.completed ? "Completed" : objective.importance}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
