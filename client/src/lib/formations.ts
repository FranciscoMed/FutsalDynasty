export type Formation = "4-0" | "3-1" | "2-2";

export type PositionRole = 
  | "Goalkeeper"
  | "Fixo" 
  | "Ala" 
  | "Pivot";

export interface PositionSlot {
  id: string;
  role: PositionRole;
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
}

export interface FormationLayout {
  id: Formation;
  name: string;
  positions: PositionSlot[];
}

export const FORMATIONS: Record<Formation, FormationLayout> = {
  "4-0": {
    id: "4-0",
    name: "4-0",
    positions: [
      { id: "gk", role: "Goalkeeper", x: 50, y: 88 },
      { id: "def-1", role: "Fixo", x: 20, y: 55 },
      { id: "def-2", role: "Ala", x: 40, y: 45 },
      { id: "def-3", role: "Pivot", x: 60, y: 45 },
      { id: "def-4", role: "Ala", x: 80, y: 55 },
    ]
  },
  "3-1": {
    id: "3-1",
    name: "3-1",
    positions: [
      { id: "gk", role: "Goalkeeper", x: 50, y: 88 },
      { id: "fixo", role: "Fixo", x: 50, y: 67 },
      { id: "ala-left", role: "Ala", x: 20, y: 55 },
      { id: "ala-right", role: "Ala", x: 80, y: 55 },
      { id: "pivot", role: "Pivot", x: 50, y: 25 },
    ]
  },
  "2-2": {
    id: "2-2",
    name: "2-2",
    positions: [
      { id: "gk", role: "Goalkeeper", x: 50, y: 88 },
      { id: "fixo-left", role: "Fixo", x: 25, y: 65 },
      { id: "fixo-right", role: "Fixo", x: 75, y: 65 },
      { id: "ala-left", role: "Ala", x: 30, y: 35 },
      { id: "pivot", role: "Pivot", x: 70, y: 35 },
    ]
  },
};
