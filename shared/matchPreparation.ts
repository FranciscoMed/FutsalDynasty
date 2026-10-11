import type { MatchPreparation, Player } from "./schema";

const formationSlots: Record<MatchPreparation["formation"], readonly string[]> = {
  "2-2": ["gk", "fixo-left", "fixo-right", "ala-left", "pivot"],
  "3-1": ["gk", "fixo", "ala-left", "ala-right", "pivot"],
  "4-0": ["gk", "def-1", "def-2", "def-3", "def-4"],
};

const mentalities = ["VeryDefensive", "Defensive", "Balanced", "Attacking", "VeryAttacking"] as const;
const pressingIntensities = ["Low", "Medium", "High", "VeryHigh"] as const;
const flyGoalkeeperOptions = ["Never", "Sometimes", "Always"] as const;

type ValidationResult =
  | { preparation: MatchPreparation; error?: never }
  | { preparation?: never; error: string };

export type MatchEligibility = Pick<
  Player,
  "id" | "position" | "injured" | "injuryDaysRemaining" | "suspended" | "suspensionMatchesRemaining"
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlayerId(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isFormation(value: unknown): value is MatchPreparation["formation"] {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(formationSlots, value);
}

function isOneOf<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

export function isEligibleForMatch(player: MatchEligibility): boolean {
  return !player.injured
    && player.injuryDaysRemaining <= 0
    && !player.suspended
    && player.suspensionMatchesRemaining <= 0;
}

export function validateMatchPreparation(input: unknown, squad: MatchEligibility[]): ValidationResult {
  if (!isRecord(input)) {
    return { error: "Match preparation must be an object" };
  }

  const { formation, assignments, substitutes, instructions } = input;
  if (!isFormation(formation)) {
    return { error: "Formation is not supported for match preparation" };
  }
  if (!isRecord(assignments)) {
    return { error: "Starting lineup assignments are required" };
  }

  const requiredSlots = formationSlots[formation];
  if (Object.keys(assignments).length !== requiredSlots.length
    || !requiredSlots.every(slot => Object.prototype.hasOwnProperty.call(assignments, slot))) {
    return { error: "Starting lineup must fill every position in the selected formation" };
  }

  const assignmentIds: number[] = [];
  const normalizedAssignments: Record<string, number | null> = {};
  for (const slot of requiredSlots) {
    const playerId = assignments[slot];
    if (!isPlayerId(playerId)) {
      return { error: "Starting lineup must have exactly 5 players" };
    }
    assignmentIds.push(playerId);
    normalizedAssignments[slot] = playerId;
  }

  if (new Set(assignmentIds).size !== assignmentIds.length) {
    return { error: "A player cannot be selected for more than one position" };
  }
  if (!Array.isArray(substitutes) || substitutes.length !== 5) {
    return { error: "Substitutes must contain five roster slots" };
  }

  const substituteIds: number[] = [];
  const normalizedSubstitutes: (number | null)[] = [];
  for (const playerId of substitutes) {
    if (playerId !== null && !isPlayerId(playerId)) {
      return { error: "Substitute selection is invalid" };
    }
    if (typeof playerId === "number") {
      substituteIds.push(playerId);
    }
    normalizedSubstitutes.push(playerId);
  }

  const allSelectedIds = [...assignmentIds, ...substituteIds];
  if (new Set(allSelectedIds).size !== allSelectedIds.length) {
    return { error: "A player cannot be selected more than once" };
  }

  if (!isRecord(instructions)
    || !isOneOf(mentalities, instructions.mentality)
    || !isOneOf(pressingIntensities, instructions.pressingIntensity)
    || !isOneOf(flyGoalkeeperOptions, instructions.flyGoalkeeper)) {
    return { error: "Tactical instructions are invalid" };
  }

  const playersById = new Map(squad.map(player => [player.id, player]));
  const eligiblePlayers = squad.filter(isEligibleForMatch);
  if (eligiblePlayers.length < 5) {
    return { error: "At least five eligible players are required to prepare for a match" };
  }

  for (const playerId of allSelectedIds) {
    const player = playersById.get(playerId);
    if (!player || !isEligibleForMatch(player)) {
      return { error: "Starting lineup and substitutes must use eligible players from your squad" };
    }
  }

  const goalkeeperId = normalizedAssignments.gk;
  if (typeof goalkeeperId !== "number" || playersById.get(goalkeeperId)?.position !== "Goalkeeper") {
    return { error: "Starting lineup must assign an eligible goalkeeper" };
  }
  if (assignmentIds.slice(1).some(playerId => playersById.get(playerId)?.position === "Goalkeeper")) {
    return { error: "The goalkeeper cannot be assigned to an outfield position" };
  }

  return {
    preparation: {
      formation,
      assignments: normalizedAssignments,
      substitutes: normalizedSubstitutes,
      instructions: {
        mentality: instructions.mentality,
        pressingIntensity: instructions.pressingIntensity,
        flyGoalkeeper: instructions.flyGoalkeeper,
      },
    },
  };
}

export function getPreparedStartingPlayerIds(preparation: MatchPreparation): number[] {
  return formationSlots[preparation.formation]
    .map(slot => preparation.assignments[slot])
    .filter((playerId): playerId is number => playerId !== null);
}

export function orderPlayersForMatchPreparation<T extends MatchEligibility>(
  players: T[],
  preparation: MatchPreparation
): T[] {
  const startingIds = getPreparedStartingPlayerIds(preparation);
  const substituteIds = preparation.substitutes.filter((id): id is number => id !== null);
  const selectedIds = new Set([...startingIds, ...substituteIds]);
  const playersById = new Map(players.map(player => [player.id, player]));
  const selectedPlayers = [...startingIds, ...substituteIds]
    .map(id => playersById.get(id))
    .filter((player): player is T => player !== undefined && isEligibleForMatch(player));
  const remainingPlayers = players.filter(player => !selectedIds.has(player.id) && isEligibleForMatch(player));

  return [...selectedPlayers, ...remainingPlayers];
}
