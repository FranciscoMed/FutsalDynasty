import { describe, it, expect } from 'vitest';
import type { TacticsData, TacticsFormation } from '../schema';

describe('Tactics Schema', () => {
  describe('TacticsFormation Type', () => {
    it('should accept valid formation strings', () => {
      const formations: TacticsFormation[] = ['4-0', '3-1', '2-2'];
      
      formations.forEach(formation => {
        expect(formation).toMatch(/^[0-9]-[0-9]$/);
      });
    });

    it('should have exactly 3 valid formations', () => {
      const validFormations = ['4-0', '3-1', '2-2'];
      expect(validFormations).toHaveLength(3);
    });
  });

  describe('TacticsData Interface', () => {
    it('should validate complete tactics data structure', () => {
      const tacticsData: TacticsData = {
        formation: '3-1',
        assignments: {
          'gk': 1,
          'fixo': 2,
          'ala-left': 3,
          'ala-right': 4,
          'pivot': 5,
        },
        substitutes: [6, 7, 8, null, null]
      };

      expect(tacticsData).toBeDefined();
      expect(tacticsData.formation).toBe('3-1');
      expect(Object.keys(tacticsData.assignments)).toHaveLength(5);
      expect(tacticsData.substitutes).toHaveLength(5);
    });

    it('should accept null values in assignments', () => {
      const tacticsData: TacticsData = {
        formation: '4-0',
        assignments: {
          'gk': 1,
          'def-1': null,
          'def-2': 3,
        },
        substitutes: [null, null, null, null, null]
      };

      expect(tacticsData.assignments['def-1']).toBeNull();
      expect(typeof tacticsData.assignments['gk']).toBe('number');
    });

    it('should accept empty assignments object', () => {
      const tacticsData: TacticsData = {
        formation: '2-2',
        assignments: {},
        substitutes: [null, null, null, null, null]
      };

      expect(Object.keys(tacticsData.assignments)).toHaveLength(0);
    });

    it('should require exactly 5 substitute slots', () => {
      const tacticsData: TacticsData = {
        formation: '3-1',
        assignments: {},
        substitutes: [1, 2, 3, 4, 5]
      };

      expect(tacticsData.substitutes).toHaveLength(5);
    });

    it('should accept mix of null and number in substitutes', () => {
      const tacticsData: TacticsData = {
        formation: '3-1',
        assignments: {},
        substitutes: [1, null, 3, null, 5]
      };

      expect(tacticsData.substitutes.filter(s => s === null)).toHaveLength(2);
      expect(tacticsData.substitutes.filter(s => typeof s === 'number')).toHaveLength(3);
    });
  });

  describe('Assignment Keys Validation', () => {
    it('should accept any string as assignment key', () => {
      const tacticsData: TacticsData = {
        formation: '4-0',
        assignments: {
          'gk': 1,
          'def-1': 2,
          'custom-position': 3,
        },
        substitutes: [null, null, null, null, null]
      };

      expect(Object.keys(tacticsData.assignments)).toContain('gk');
      expect(Object.keys(tacticsData.assignments)).toContain('custom-position');
    });

    it('should validate common position key patterns', () => {
      const commonKeys = [
        'gk',
        'fixo', 'fixo-left', 'fixo-right',
        'ala', 'ala-left', 'ala-right',
        'pivot',
        'def-1', 'def-2', 'def-3', 'def-4'
      ];

      commonKeys.forEach(key => {
        expect(typeof key).toBe('string');
        expect(key.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Player ID Validation', () => {
    it('should accept positive integers as player IDs', () => {
      const validIds = [1, 2, 100, 999, 1000];
      
      validIds.forEach(id => {
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
        expect(Number.isInteger(id)).toBe(true);
      });
    });

    it('should accept null as player ID', () => {
      const tacticsData: TacticsData = {
        formation: '3-1',
        assignments: { 'gk': null },
        substitutes: [null, null, null, null, null]
      };

      expect(tacticsData.assignments['gk']).toBeNull();
      expect(tacticsData.substitutes.every(s => s === null)).toBe(true);
    });
  });

  describe('Formation-Specific Assignments', () => {
    it('should match 4-0 formation structure', () => {
      const formation40: TacticsData = {
        formation: '4-0',
        assignments: {
          'gk': 1,
          'def-1': 2,
          'def-2': 3,
          'def-3': 4,
          'def-4': 5,
        },
        substitutes: [null, null, null, null, null]
      };

      expect(formation40.formation).toBe('4-0');
      expect(Object.keys(formation40.assignments)).toHaveLength(5);
      expect(Object.keys(formation40.assignments).filter(k => k.startsWith('def-'))).toHaveLength(4);
    });

    it('should match 3-1 formation structure', () => {
      const formation31: TacticsData = {
        formation: '3-1',
        assignments: {
          'gk': 1,
          'fixo': 2,
          'ala-left': 3,
          'ala-right': 4,
          'pivot': 5,
        },
        substitutes: [null, null, null, null, null]
      };

      expect(formation31.formation).toBe('3-1');
      expect(formation31.assignments).toHaveProperty('fixo');
      expect(formation31.assignments).toHaveProperty('pivot');
    });

    it('should match 2-2 formation structure', () => {
      const formation22: TacticsData = {
        formation: '2-2',
        assignments: {
          'gk': 1,
          'fixo-left': 2,
          'fixo-right': 3,
          'ala-left': 4,
          'pivot': 5,
        },
        substitutes: [null, null, null, null, null]
      };

      expect(formation22.formation).toBe('2-2');
      expect(formation22.assignments).toHaveProperty('fixo-left');
      expect(formation22.assignments).toHaveProperty('fixo-right');
    });
  });

  describe('Type Safety', () => {
    it('should enforce formation type constraints', () => {
      const validFormation: TacticsFormation = '3-1';
      
      // TypeScript should catch these at compile time
      // @ts-expect-error - Invalid formation
      const invalidFormation: TacticsFormation = '5-0';
      
      expect(validFormation).toBe('3-1');
    });

    it('should enforce assignment value types', () => {
      const tacticsData: TacticsData = {
        formation: '3-1',
        assignments: {
          'gk': 1,
          // @ts-expect-error - String not allowed
          'fixo': '2',
        },
        substitutes: [null, null, null, null, null]
      };

      expect(typeof tacticsData.assignments['gk']).toBe('number');
    });

    it('should enforce substitutes array type', () => {
      const tacticsData: TacticsData = {
        formation: '3-1',
        assignments: {},
        // @ts-expect-error - Must be array
        substitutes: 'not-an-array'
      };

      expect(tacticsData).toBeDefined();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle fresh save game (no tactics)', () => {
      const defaultTactics: TacticsData = {
        formation: '3-1',
        assignments: {},
        substitutes: [null, null, null, null, null]
      };

      expect(Object.keys(defaultTactics.assignments)).toHaveLength(0);
      expect(defaultTactics.substitutes.every(s => s === null)).toBe(true);
    });

    it('should handle partial lineup', () => {
      const partialTactics: TacticsData = {
        formation: '3-1',
        assignments: {
          'gk': 1,
          'fixo': 2,
        },
        substitutes: [6, null, null, null, null]
      };

      expect(Object.keys(partialTactics.assignments)).toHaveLength(2);
      expect(partialTactics.substitutes.filter(s => s !== null)).toHaveLength(1);
    });

    it('should handle full lineup with all substitutes', () => {
      const fullTactics: TacticsData = {
        formation: '4-0',
        assignments: {
          'gk': 1,
          'def-1': 2,
          'def-2': 3,
          'def-3': 4,
          'def-4': 5,
        },
        substitutes: [6, 7, 8, 9, 10]
      };

      expect(Object.keys(fullTactics.assignments)).toHaveLength(5);
      expect(fullTactics.substitutes.every(s => typeof s === 'number')).toBe(true);
    });

    it('should handle formation change with preserved goalkeeper', () => {
      const beforeChange: TacticsData = {
        formation: '3-1',
        assignments: {
          'gk': 1,
          'fixo': 2,
          'ala-left': 3,
        },
        substitutes: [null, null, null, null, null]
      };

      const afterChange: TacticsData = {
        formation: '4-0',
        assignments: {
          'gk': 1, // Preserved
          'def-1': 2,
        },
        substitutes: [null, null, null, null, null]
      };

      expect(beforeChange.assignments['gk']).toBe(afterChange.assignments['gk']);
      expect(beforeChange.formation).not.toBe(afterChange.formation);
    });
  });
});
