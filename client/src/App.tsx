import { useEffect } from "react";
import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/sonner";
import { DashboardLayout } from "./components/DashboardLayout";
import { HomePage } from "./pages/HomePage";
import { SquadPage } from "./pages/SquadPage";
import { TacticsPage } from "./pages/TacticsPage";
import { InboxPage } from "./pages/InboxPage";
import { TrainingPage } from "./pages/TrainingPage";
import { FinancesPage } from "./pages/FinancesPage";
import { ClubPage } from "./pages/ClubPage";
import { MatchesPage } from "./pages/MatchesPage";
import { CompetitionsPage } from "./pages/CompetitionsPage";
import MatchPage from "./pages/MatchPage";
import PostMatchPage from "./pages/PostMatchPage";
import AuthPage from "./pages/AuthPage";
import SaveGameSelectionPage from "./pages/SaveGameSelectionPage";
import { useAuth } from "./lib/stores/useAuth";
import { useFutsalManager } from "./lib/stores/useFutsalManager";
import "@fontsource/inter";

function AppContent() {
  const { isAuthenticated, isLoading, activeSaveGame, checkSession } = useAuth();
  const { loadGameData } = useFutsalManager();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (activeSaveGame) {
      console.log("Loading game data for save game:", activeSaveGame.id);
      loadGameData();
    }
  }, [activeSaveGame, loadGameData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f6efe3] to-[#f6efe3]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (!activeSaveGame) {
    return <SaveGameSelectionPage />;
  }

  return (
    <>
      <DashboardLayout>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/squad" component={SquadPage} />
          <Route path="/tactics" component={TacticsPage} />
          <Route path="/matches" component={MatchesPage} />
          <Route path="/match/:matchId" component={MatchPage} />
          <Route path="/match/:matchId/post-match" component={PostMatchPage} />
          <Route path="/inbox" component={InboxPage} />
          <Route path="/training" component={TrainingPage} />
          <Route path="/finances" component={FinancesPage} />
          <Route path="/club" component={ClubPage} />
          <Route path="/transfers">
            <ComingSoonPage title="Transfers" />
          </Route>
          <Route path="/competitions" component={CompetitionsPage} />
        </Switch>
      </DashboardLayout>
      <Toaster position="top-right" richColors />
    </>
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
