import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TacticsPage } from '../TacticsPage';
import { useFutsalManager } from '@/lib/stores/useFutsalManager';
import type { Player } from '@/../../shared/schema';

// Mock dependencies
vi.mock('@/lib/stores/useFutsalManager');
vi.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}));
vi.mock('react-dnd-touch-backend', () => ({
  TouchBackend: {},
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock components
vi.mock('@/components/tactics/FutsalField', () => ({
  FutsalField: () => <div data-testid="futsal-field">Field</div>,
}));
vi.mock('@/components/tactics/PlayerPool', () => ({
  PlayerPool: () => <div data-testid="player-pool">Player Pool</div>,
}));
vi.mock('@/components/tactics/SubstitutesBench', () => ({
  SubstitutesBench: () => <div data-testid="substitutes-bench">Substitutes</div>,
}));

const mockPlayers: Player[] = [
  {
    id: 1,
    teamId: 1,
    name: "John Doe",
    age: 25,
    position: "Goalkeeper",
    nationality: "USA",
    attributes: {
      shooting: 50,
      passing: 60,
      dribbling: 40,
      ballControl: 55,
      firstTouch: 60,
      pace: 65,
      stamina: 75,
      strength: 75,
      agility: 70,
      tackling: 45,
      positioning: 80,
      marking: 50,
      interceptions: 60,
      vision: 65,
      decisionMaking: 72,
      composure: 75,
      workRate: 70,
      reflexes: 85,
      handling: 82,
      gkPositioning: 80,
      distribution: 70,
    },
    potential: 80,
    currentAbility: 75,
    form: 7,
    morale: 80,
    fitness: 90,
    condition: 95,
    injured: false,
    injuryDaysRemaining: 0,
    suspended: false,
    suspensionMatchesRemaining: 0,
    yellowCards: 0,
    redCards: 0,
    contract: {
      salary: 5000,
      length: 2,
      releaseClause: 100000,
    },
    value: 100000,
    trainingFocus: {
      primary: "technical",
      secondary: "physical",
      intensity: "medium",
    },
  },
  {
    id: 2,
    teamId: 1,
    name: "Jane Smith",
    age: 23,
    position: "Defender",
    nationality: "UK",
    attributes: {
      shooting: 60,
      passing: 70,
      dribbling: 68,
      ballControl: 72,
      firstTouch: 70,
      pace: 78,
      stamina: 80,
      strength: 75,
      agility: 76,
      tackling: 80,
      positioning: 78,
      marking: 82,
      interceptions: 79,
      vision: 72,
      decisionMaking: 76,
      composure: 74,
      workRate: 85,
    },
    potential: 85,
    currentAbility: 78,
    form: 8,
    morale: 85,
    fitness: 95,
    condition: 98,
    injured: false,
    injuryDaysRemaining: 0,
    suspended: false,
    suspensionMatchesRemaining: 0,
    yellowCards: 1,
    redCards: 0,
    contract: {
      salary: 6000,
      length: 3,
      releaseClause: 150000,
    },
    value: 150000,
    trainingFocus: {
      primary: "defensive",
      secondary: "physical",
      intensity: "high",
    },
  },
];

describe('TacticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    (useFutsalManager as any).mockReturnValue({
      players: mockPlayers,
    });
  });

  describe('Initial Load', () => {
    it('should render loading state initially', () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          formation: '3-1',
          assignments: {},
          substitutes: [null, null, null, null, null],
        }),
      });

      render(<TacticsPage />);
      
      expect(screen.getByText(/loading tactics/i)).toBeInTheDocument();
    });

    it('should fetch tactics data on mount', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          formation: '3-1',
          assignments: {},
          substitutes: [null, null, null, null, null],
        }),
      });

      render(<TacticsPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/tactics');
      });
    });

    it('should render main components after loading', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          formation: '3-1',
          assignments: {},
          substitutes: [null, null, null, null, null],
        }),
      });

      render(<TacticsPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading tactics/i)).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('futsal-field')).toBeInTheDocument();
      expect(screen.getByTestId('player-pool')).toBeInTheDocument();
      expect(screen.getByTestId('substitutes-bench')).toBeInTheDocument();
    });
  });

  describe('Formation Selection', () => {
    it('should display formation selector', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          formation: '3-1',
          assignments: {},
          substitutes: [null, null, null, null, null],
        }),
      });

      render(<TacticsPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading tactics/i)).not.toBeInTheDocument();
      });

      // Formation selector should be present
      const selects = document.querySelectorAll('[role="combobox"]');
      expect(selects.length).toBeGreaterThan(0);
    });
  });

  describe('Action Buttons', () => {
    it('should render reset and save buttons after loading', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          formation: '3-1',
          assignments: {},
          substitutes: [null, null, null, null, null],
        }),
      });

      render(<TacticsPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading tactics/i)).not.toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save tactics/i })).toBeInTheDocument();
    });

    it('should not render buttons during loading', () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          formation: '3-1',
          assignments: {},
          substitutes: [null, null, null, null, null],
        }),
      });

      render(<TacticsPage />);

      // During loading, buttons should not exist
      expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });

    it('should disable save button when lineup is incomplete', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          formation: '3-1',
          assignments: {},
          substitutes: [null, null, null, null, null],
        }),
      });

      render(<TacticsPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading tactics/i)).not.toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save tactics/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<TacticsPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('should handle non-ok response', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      render(<TacticsPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Player Assignment Logic', () => {
    it('should initialize with empty assignments', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          formation: '3-1',
          assignments: {},
          substitutes: [null, null, null, null, null],
        }),
      });

      render(<TacticsPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading tactics/i)).not.toBeInTheDocument();
      });

      // Component should render without errors
      expect(screen.getByTestId('futsal-field')).toBeInTheDocument();
    });

    it('should load saved assignments from API', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          formation: '3-1',
          assignments: {
            'gk': 1,
            'fixo': 2,
          },
          substitutes: [null, null, null, null, null],
        }),
      });

      render(<TacticsPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading tactics/i)).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('futsal-field')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show validation badge when lineup is incomplete', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          formation: '3-1',
          assignments: {},
          substitutes: [null, null, null, null, null],
        }),
      });

      render(<TacticsPage />);

      await waitFor(() => {
        expect(screen.queryByText(/loading tactics/i)).not.toBeInTheDocument();
      });

      // Should show incomplete status
      expect(screen.getByText(/incomplete/i)).toBeInTheDocument();
    });
  });
});
