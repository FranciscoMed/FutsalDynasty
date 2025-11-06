import { describe, it, expect } from 'vitest';
import { FORMATIONS, Formation, PositionRole } from '../formations';

describe('Formations Library', () => {
  describe('Formation Structure', () => {
    it('should have exactly 3 formations', () => {
      const formationKeys = Object.keys(FORMATIONS);
      expect(formationKeys).toHaveLength(3);
      expect(formationKeys).toEqual(['4-0', '3-1', '2-2']);
    });

    it('should have consistent formation IDs and names', () => {
      Object.entries(FORMATIONS).forEach(([key, formation]) => {
        expect(formation.id).toBe(key);
        expect(formation.name).toBe(key);
      });
    });

    it('should have exactly 5 positions per formation', () => {
      Object.values(FORMATIONS).forEach((formation) => {
        expect(formation.positions).toHaveLength(5);
      });
    });
  });

  describe('Position Coordinates', () => {
    it('should have valid x coordinates (0-100)', () => {
      Object.values(FORMATIONS).forEach((formation) => {
        formation.positions.forEach((position) => {
          expect(position.x).toBeGreaterThanOrEqual(0);
          expect(position.x).toBeLessThanOrEqual(100);
        });
      });
    });

    it('should have valid y coordinates (0-100)', () => {
      Object.values(FORMATIONS).forEach((formation) => {
        formation.positions.forEach((position) => {
          expect(position.y).toBeGreaterThanOrEqual(0);
          expect(position.y).toBeLessThanOrEqual(100);
        });
      });
    });

    it('should have goalkeeper at bottom center (x=50, y=88)', () => {
      Object.values(FORMATIONS).forEach((formation) => {
        const gk = formation.positions.find(p => p.role === 'Goalkeeper');
        expect(gk).toBeDefined();
        expect(gk!.x).toBe(50);
        expect(gk!.y).toBe(88);
      });
    });
  });

  describe('Position Roles', () => {
    it('should have exactly one goalkeeper per formation', () => {
      Object.values(FORMATIONS).forEach((formation) => {
        const goalkeepers = formation.positions.filter(
          p => p.role === 'Goalkeeper'
        );
        expect(goalkeepers).toHaveLength(1);
      });
    });

    it('should have valid position roles', () => {
      const validRoles: PositionRole[] = ['Goalkeeper', 'Fixo', 'Ala', 'Pivot'];
      
      Object.values(FORMATIONS).forEach((formation) => {
        formation.positions.forEach((position) => {
          expect(validRoles).toContain(position.role);
        });
      });
    });

    it('should have goalkeeper id as "gk" in all formations', () => {
      Object.values(FORMATIONS).forEach((formation) => {
        const gk = formation.positions.find(p => p.role === 'Goalkeeper');
        expect(gk!.id).toBe('gk');
      });
    });
  });

  describe('Formation-Specific Tests', () => {
    describe('4-0 Formation', () => {
      const formation = FORMATIONS['4-0'];

      it('should have correct position IDs', () => {
        const positionIds = formation.positions.map(p => p.id);
        expect(positionIds).toEqual(['gk', 'def-1', 'def-2', 'def-3', 'def-4']);
      });

      it('should have 4 outfield players', () => {
        const outfield = formation.positions.filter(p => p.role !== 'Goalkeeper');
        expect(outfield).toHaveLength(4);
      });

      it('should have defensive roles', () => {
        const roles = formation.positions.map(p => p.role);
        expect(roles).toContain('Fixo');
        expect(roles).toContain('Ala');
        expect(roles).toContain('Pivot');
      });
    });

    describe('3-1 Formation', () => {
      const formation = FORMATIONS['3-1'];

      it('should have correct position IDs', () => {
        const positionIds = formation.positions.map(p => p.id);
        expect(positionIds).toEqual(['gk', 'fixo', 'ala-left', 'ala-right', 'pivot']);
      });

      it('should have symmetrical wing positions', () => {
        const alaLeft = formation.positions.find(p => p.id === 'ala-left');
        const alaRight = formation.positions.find(p => p.id === 'ala-right');
        
        expect(alaLeft).toBeDefined();
        expect(alaRight).toBeDefined();
        expect(alaLeft!.y).toBe(alaRight!.y); // Same vertical position
        expect(alaLeft!.x).toBeLessThan(50); // Left side
        expect(alaRight!.x).toBeGreaterThan(50); // Right side
      });

      it('should have pivot at front (lowest y coordinate)', () => {
        const pivot = formation.positions.find(p => p.id === 'pivot');
        const otherPlayers = formation.positions.filter(p => p.id !== 'pivot' && p.role !== 'Goalkeeper');
        
        expect(pivot).toBeDefined();
        otherPlayers.forEach(player => {
          expect(pivot!.y).toBeLessThan(player.y);
        });
      });
    });

    describe('2-2 Formation', () => {
      const formation = FORMATIONS['2-2'];

      it('should have correct position IDs', () => {
        const positionIds = formation.positions.map(p => p.id);
        expect(positionIds).toEqual(['gk', 'fixo-left', 'fixo-right', 'ala-left', 'pivot']);
      });

      it('should have two fixo positions', () => {
        const fixos = formation.positions.filter(p => p.id.includes('fixo'));
        expect(fixos).toHaveLength(2);
      });

      it('should have symmetrical defensive positions', () => {
        const fixoLeft = formation.positions.find(p => p.id === 'fixo-left');
        const fixoRight = formation.positions.find(p => p.id === 'fixo-right');
        
        expect(fixoLeft).toBeDefined();
        expect(fixoRight).toBeDefined();
        expect(fixoLeft!.y).toBe(fixoRight!.y); // Same vertical position
      });
    });
  });

  describe('Type Safety', () => {
    it('should only allow valid formation types', () => {
      const validFormations: Formation[] = ['4-0', '3-1', '2-2'];
      
      validFormations.forEach(formation => {
        expect(FORMATIONS[formation]).toBeDefined();
      });
    });

    it('should have proper TypeScript types', () => {
      Object.values(FORMATIONS).forEach((formation) => {
        expect(typeof formation.id).toBe('string');
        expect(typeof formation.name).toBe('string');
        expect(Array.isArray(formation.positions)).toBe(true);
        
        formation.positions.forEach((position) => {
          expect(typeof position.id).toBe('string');
          expect(typeof position.role).toBe('string');
          expect(typeof position.x).toBe('number');
          expect(typeof position.y).toBe('number');
        });
      });
    });
  });
});
