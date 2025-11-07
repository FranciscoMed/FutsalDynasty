import { useState, useEffect } from "react";
import { useAuth } from "../lib/stores/useAuth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { format } from "date-fns";

interface SaveGame {
  id: number;
  userId: number;
  name: string;
  currentDate: Date;
  season: number;
  playerTeamId: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function SaveGameSelectionPage() {
  const { user, logout, setActiveSaveGame } = useAuth();
  const [saveGames, setSaveGames] = useState<SaveGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState("");
  const [showNewGameDialog, setShowNewGameDialog] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamAbbr, setTeamAbbr] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSaveGames();
  }, []);

  const loadSaveGames = async () => {
    try {
      const response = await fetch("/api/savegames");
      if (response.ok) {
        const data = await response.json();
        setSaveGames(data);
      }
    } catch (err) {
      console.error("Failed to load save games:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newGameName || !teamName || !teamAbbr) {
      setError("All fields are required");
      return;
    }

    if (teamAbbr.length > 3) {
      setError("Team abbreviation must be 3 characters or less");
      return;
    }

    try {
      setShowNewGameDialog(false);
      setIsCreating(true);
      setCreationProgress("Creating your team...");

      await new Promise(resolve => setTimeout(resolve, 500));

      setCreationProgress("Generating AI teams and players...");

      const response = await fetch("/api/savegames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newGameName, 
          teamName, 
          teamAbbr: teamAbbr.toUpperCase() 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create save game");
      }

      setCreationProgress("Setting up competitions...");
      await new Promise(resolve => setTimeout(resolve, 500));

      setCreationProgress("Finalizing your save game...");
      await new Promise(resolve => setTimeout(resolve, 300));

      const saveGame = await response.json();
      
      setCreationProgress("Loading game...");
      await new Promise(resolve => setTimeout(resolve, 200));

      setActiveSaveGame(saveGame);
    } catch (err: any) {
      setIsCreating(false);
      setError(err.message || "Failed to create save game");
      setShowNewGameDialog(true);
    }
  };

  const handleLoadSaveGame = async (saveGameId: number) => {
    try {
      const response = await fetch(`/api/savegames/${saveGameId}/load`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to load save game");
      }

      const data = await response.json();
      setActiveSaveGame(data.saveGame);
    } catch (err) {
      console.error("Failed to load save game:", err);
    }
  };

  const handleDeleteSaveGame = async (saveGameId: number) => {
    if (!confirm("Are you sure you want to delete this save game? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/savegames/${saveGameId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        loadSaveGames();
      }
    } catch (err) {
      console.error("Failed to delete save game:", err);
    }
  };

  if (isCreating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Creating Your Game</CardTitle>
            <CardDescription className="text-center">
              Please wait while we set up your futsal empire...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 border-4 border-[#d18643] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-center text-lg font-medium">{creationProgress}</p>
            </div>
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p>• Generating 40+ AI teams</p>
              <p>• Creating 520+ players with unique attributes</p>
              <p>• Setting up 3 competitions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6efe3] to-[#f6efe3] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-end items-center mb-2">
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/logo.png" 
            alt="Futsal Manager" 
            className="w-32 h-32 object-contain mb-2"
          />
          <p className="text-[#703214]/80 text-lg">Welcome, {user?.username}!</p>
        </div>

        <div className="grid gap-6">
          <Dialog open={showNewGameDialog} onOpenChange={setShowNewGameDialog}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed">
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="text-4xl mb-2">+</div>
                    <div className="text-xl font-semibold">New Game</div>
                    <div className="text-sm text-muted-foreground">Start a new career</div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Game</DialogTitle>
                <DialogDescription>
                  Start a new futsal manager career. Choose your team name and begin your journey!
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateNewGame} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="gameName">Save Game Name</Label>
                  <Input
                    id="gameName"
                    placeholder="My Futsal Career"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamName">Team Name</Label>
                  <Input
                    id="teamName"
                    placeholder="FC United"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamAbbr">Team Abbreviation (3 letters)</Label>
                  <Input
                    id="teamAbbr"
                    placeholder="FCU"
                    value={teamAbbr}
                    onChange={(e) => setTeamAbbr(e.target.value.toUpperCase())}
                    maxLength={3}
                    required
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowNewGameDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Create Game
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p>Loading your save games...</p>
              </CardContent>
            </Card>
          ) : saveGames.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">You don't have any save games yet. Create one to get started!</p>
              </CardContent>
            </Card>
          ) : (
            saveGames.map((saveGame) => (
              <Card key={saveGame.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{saveGame.name}</CardTitle>
                      <CardDescription>
                        Season {saveGame.season} • Last played {format(new Date(saveGame.updatedAt), "PPp")}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleLoadSaveGame(saveGame.id)}>
                        Continue
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSaveGame(saveGame.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
