import { useEffect } from "react";
import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { DashboardLayout } from "./components/DashboardLayout";
import { HomePage } from "./pages/HomePage";
import { SquadPage } from "./pages/SquadPage";
import { TacticsPage } from "./pages/TacticsPage";
import { InboxPage } from "./pages/InboxPage";
import { useFutsalManager } from "./lib/stores/useFutsalManager";
import "@fontsource/inter";

function App() {
  const { initialized, initializeGame, loadGameData } = useFutsalManager();

  useEffect(() => {
    if (!initialized) {
      initializeGame();
    }
  }, [initialized]);

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardLayout>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/squad" component={SquadPage} />
          <Route path="/tactics" component={TacticsPage} />
          <Route path="/inbox" component={InboxPage} />
          <Route path="/training">
            <ComingSoonPage title="Training" />
          </Route>
          <Route path="/transfers">
            <ComingSoonPage title="Transfers" />
          </Route>
          <Route path="/competitions">
            <ComingSoonPage title="Competitions" />
          </Route>
          <Route path="/finances">
            <ComingSoonPage title="Finances" />
          </Route>
          <Route path="/club">
            <ComingSoonPage title="Club" />
          </Route>
        </Switch>
      </DashboardLayout>
    </QueryClientProvider>
  );
}

function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-xl mb-2">Coming Soon</p>
        <p>This feature is under development</p>
      </div>
    </div>
  );
}

export default App;
