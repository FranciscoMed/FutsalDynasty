import { describe, expect, it } from "vitest";
import { CompetitionEngine } from "../competitionEngine";

describe("save creation regression", () => {
  it("generates a complete 15-player AI squad with valid positions", async () => {
    const createdPlayers: Array<{ position: string }> = [];

    const storage = {
      createPlayer: async (_saveGameId: number, _userId: number, player: { position: string }) => {
        createdPlayers.push(player);
        return { ...player, id: createdPlayers.length } as any;
      },
    } as any;

    const engine = new CompetitionEngine(storage);

    await engine.generateAISquad(42, 155, 9, 7);

    expect(createdPlayers).toHaveLength(15);
    expect(createdPlayers.every((player) => player.position && ["Goalkeeper", "Defender", "Winger", "Pivot"].includes(player.position))).toBe(true);
  });
});
