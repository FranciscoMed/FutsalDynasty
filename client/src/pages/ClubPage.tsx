import { useEffect } from "react";
import { useFutsalManager } from "@/lib/stores/useFutsalManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building, Users, Target, Star } from "lucide-react";

export function ClubPage() {
  const { club, loadGameData, loading } = useFutsalManager();

  useEffect(() => {
    loadGameData();
  }, []);

  if (loading || !club) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading club information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{club.name}</h1>
        <p className="text-muted-foreground">Manage your club's facilities and staff</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reputation</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{club.reputation}/100</div>
            <Progress value={club.reputation} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stadium</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {club.stadiumCapacity.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Capacity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Training Facility</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Level {club.trainingFacilityLevel}</div>
            <p className="text-xs text-muted-foreground">Good facilities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Youth Academy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Level {club.youthAcademyLevel}</div>
            <p className="text-xs text-muted-foreground">Developing talent</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Club Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Stadium</p>
                <p className="font-medium">{club.stadium}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="font-medium">{club.stadiumCapacity.toLocaleString()} seats</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Club Reputation</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={club.reputation} className="flex-1" />
                  <span className="font-medium">{club.reputation}/100</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backroom Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span>Assistant Coach</span>
                <Badge variant={club.staff.assistantCoach ? "default" : "outline"}>
                  {club.staff.assistantCoach ? "Hired" : "Not Hired"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span>Fitness Coach</span>
                <Badge variant={club.staff.fitnessCoach ? "default" : "outline"}>
                  {club.staff.fitnessCoach ? "Hired" : "Not Hired"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span>Scout</span>
                <Badge variant={club.staff.scout ? "default" : "outline"}>
                  {club.staff.scout ? "Hired" : "Not Hired"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Board Objectives</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {club.boardObjectives.map((objective, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{objective.description}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Target: {objective.target}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      objective.importance === "high"
                        ? "destructive"
                        : objective.importance === "medium"
                        ? "default"
                        : "outline"
                    }
                  >
                    {objective.importance}
                  </Badge>
                  <Badge variant={objective.completed ? "default" : "outline"}>
                    {objective.completed ? "✓ Completed" : "In Progress"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facilities Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">Training Facilities</span>
                <span className="text-sm text-muted-foreground">Level {club.trainingFacilityLevel}/5</span>
              </div>
              <Progress value={(club.trainingFacilityLevel / 5) * 100} />
              <p className="text-sm text-muted-foreground mt-1">
                Better facilities increase player development speed
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">Youth Academy</span>
                <span className="text-sm text-muted-foreground">Level {club.youthAcademyLevel}/5</span>
              </div>
              <Progress value={(club.youthAcademyLevel / 5) * 100} />
              <p className="text-sm text-muted-foreground mt-1">
                Better academy produces higher quality youth players
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">Stadium</span>
                <span className="text-sm text-muted-foreground">
                  {club.stadiumCapacity.toLocaleString()} capacity
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Larger stadiums generate more matchday revenue
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
