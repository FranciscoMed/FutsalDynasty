import type { Match, MatchPreparation } from "@shared/schema";
import { validateMatchPreparation } from "@shared/matchPreparation";
import type { IStorage } from "./storage";

type PreparationStorage = Pick<IStorage, "getMatch" | "getPlayersByTeam" | "saveMatchPreparation">;

export type SavePreparationResult =
  | { status: "saved"; match: Match; preparation: MatchPreparation }
  | { status: "already-prepared"; match: Match; preparation: MatchPreparation }
  | { status: "invalid"; error: string }
  | { status: "not-found" }
  | { status: "forbidden" }
  | { status: "played" }
  | { status: "conflict" };

export function getPlayerFixturePreparationError(
  match: Pick<Match, "homeTeamId" | "awayTeamId" | "preparationStatus" | "preparation">,
  playerTeamId: number
): string | null {
  const isPlayerFixture = match.homeTeamId === playerTeamId || match.awayTeamId === playerTeamId;
  if (isPlayerFixture && (match.preparationStatus !== "confirmed" || !match.preparation)) {
    return "Match preparation is required before this fixture can start";
  }
  return null;
}

export async function saveMatchPreparationOnce(
  storage: PreparationStorage,
  saveGameId: number,
  userId: number,
  matchId: number,
  playerTeamId: number,
  input: unknown
): Promise<SavePreparationResult> {
  const match = await storage.getMatch(saveGameId, userId, matchId);
  if (!match) return { status: "not-found" };
  if (match.homeTeamId !== playerTeamId && match.awayTeamId !== playerTeamId) {
    return { status: "forbidden" };
  }
  if (match.played) return { status: "played" };
  if (match.preparationStatus === "confirmed") {
    if (match.preparation) {
      return { status: "already-prepared", match, preparation: match.preparation };
    }
  }

  const squad = await storage.getPlayersByTeam(saveGameId, userId, playerTeamId);
  const validation = validateMatchPreparation(input, squad);
  if (!validation.preparation) return { status: "invalid", error: validation.error };

  const savedMatch = await storage.saveMatchPreparation(saveGameId, userId, matchId, validation.preparation);
  if (savedMatch) {
    return { status: "saved", match: savedMatch, preparation: validation.preparation };
  }

  const latestMatch = await storage.getMatch(saveGameId, userId, matchId);
  if (latestMatch?.preparationStatus === "confirmed" && latestMatch.preparation) {
    return { status: "already-prepared", match: latestMatch, preparation: latestMatch.preparation };
  }
  return { status: "conflict" };
}
