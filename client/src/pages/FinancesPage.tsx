import { useEffect } from "react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function FinancesPage() {
  const { club, players, loadGameData, loading } = useFutsalManager();

  useEffect(() => {
    loadGameData();
  }, []);

  if (loading || !club) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading finances...</p>
      </div>
    );
  }

  const totalWages = players.reduce((sum, p) => sum + p.contract.salary, 0);
  const wagePercentage = (totalWages / club.wageBudget) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Finances</h1>
        <p className="text-muted-foreground">
          Manage your club's budget and financial health
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transfer Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${club?.budget.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for transfers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wage Budget</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${club?.wageBudget.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly wage cap
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wages</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalWages.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {wagePercentage.toFixed(0)}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wage Room</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(club ? club.wageBudget - totalWages : 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for new signings
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wage Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Wage Usage</span>
                <span className="font-medium">
                  {wagePercentage.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={wagePercentage} 
                className={wagePercentage > 90 ? "bg-red-200" : ""}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Top Earners</h4>
                <div className="space-y-2">
                  {players
                    .sort((a, b) => b.contract.salary - a.contract.salary)
                    .slice(0, 5)
                    .map((player) => (
                      <div key={player.id} className="flex justify-between text-sm">
                        <span>{player.name}</span>
                        <span className="font-medium">
                          ${player.contract.salary.toLocaleString()}/mo
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Financial Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Squad Size</span>
                    <span className="font-medium">{players.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Wage</span>
                    <span className="font-medium">
                      ${Math.round(totalWages / players.length).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Highest Wage</span>
                    <span className="font-medium">
                      ${Math.max(...players.map(p => p.contract.salary)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lowest Wage</span>
                    <span className="font-medium">
                      ${Math.min(...players.map(p => p.contract.salary)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${
              wagePercentage < 70 
                ? "bg-success/10 border border-success" 
                : wagePercentage < 90 
                ? "bg-yellow-100 border border-yellow-500"
                : "bg-red-100 border border-red-500"
            }`}>
              <p className="font-medium">
                {wagePercentage < 70 
                  ? "✓ Excellent Financial Position" 
                  : wagePercentage < 90 
                  ? "⚠️ Moderate Financial Pressure"
                  : "⛔ High Financial Risk"}
              </p>
              <p className="text-sm mt-1">
                {wagePercentage < 70 
                  ? "You have plenty of room for new signings and wage increases." 
                  : wagePercentage < 90 
                  ? "Consider selling players before making new signings."
                  : "You need to reduce wages before making any new signings!"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
