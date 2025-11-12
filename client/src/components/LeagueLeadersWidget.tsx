import { useCompetitions, useTopScorers, useTopAssisters } from "../hooks/useServerState";

export default function LeagueLeadersWidget() {
  const { data: competitions } = useCompetitions();
  
  // Use the first competition as default
  const competitionId = competitions?.[0]?.id ?? 0;
  const selectedCompetition = competitions?.[0];

  const { data: topScorers, isLoading: loadingScorers } = useTopScorers(competitionId, 3);
  const { data: topAssisters, isLoading: loadingAssisters } = useTopAssisters(competitionId, 3);

  if (!competitions || competitions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">
        League Leaders - {selectedCompetition?.name}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Scorers */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-green-400">⚽ Top Scorers</h3>
          {loadingScorers ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : topScorers && topScorers.length > 0 ? (
            <div className="space-y-2">
              {topScorers.map((player, index) => (
                <div
                  key={player.playerId}
                  className="flex items-center justify-between bg-gray-900 rounded p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 font-bold w-6">{index + 1}</span>
                    <div>
                      <p className="font-medium">{player.playerName}</p>
                      <p className="text-xs text-gray-400">{player.teamName}</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-green-400">{player.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data available.</p>
          )}
        </div>

        {/* Top Assisters */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-blue-400">🎯 Top Assisters</h3>
          {loadingAssisters ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : topAssisters && topAssisters.length > 0 ? (
            <div className="space-y-2">
              {topAssisters.map((player, index) => (
                <div
                  key={player.playerId}
                  className="flex items-center justify-between bg-gray-900 rounded p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 font-bold w-6">{index + 1}</span>
                    <div>
                      <p className="font-medium">{player.playerName}</p>
                      <p className="text-xs text-gray-400">{player.teamName}</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-blue-400">{player.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
