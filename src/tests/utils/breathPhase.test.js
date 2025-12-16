import { describe, it, expect } from 'vitest';
import { phaseAtTime, nextPhaseBoundary, phaseBoundariesInRange } from '@utils/breathPhase';

describe('breathPhase utilities', () => {
  const breathInDuration = 6;
  const breathOutDuration = 8;
  const cycleDuration = breathInDuration + breathOutDuration; // 14

  describe('phaseAtTime', () => {
    it('should return "in" phase at the start', () => {
      const result = phaseAtTime(0, breathInDuration, breathOutDuration);
      expect(result.phase).toBe('in');
      expect(result.phaseProgress).toBe(0);
      expect(result.cycleProgress).toBe(0);
    });

    it('should return "in" phase during inhale', () => {
      const result = phaseAtTime(3, breathInDuration, breathOutDuration);
      expect(result.phase).toBe('in');
      expect(result.phaseProgress).toBe(0.5); // 3/6
      expect(result.cycleProgress).toBeCloseTo(3 / cycleDuration);
    });

    it('should return "out" phase at the end of inhale', () => {
      const result = phaseAtTime(6, breathInDuration, breathOutDuration);
      expect(result.phase).toBe('out');
      expect(result.phaseProgress).toBe(0);
      expect(result.cycleProgress).toBeCloseTo(6 / cycleDuration);
    });

    it('should return "out" phase during exhale', () => {
      const result = phaseAtTime(10, breathInDuration, breathOutDuration);
      expect(result.phase).toBe('out');
      expect(result.phaseProgress).toBe(0.5); // (10-6)/8
      expect(result.cycleProgress).toBeCloseTo(10 / cycleDuration);
    });

    it('should wrap around to "in" after full cycle', () => {
      const result = phaseAtTime(14, breathInDuration, breathOutDuration);
      expect(result.phase).toBe('in');
      expect(result.phaseProgress).toBe(0);
      expect(result.cycleProgress).toBe(0);
    });

    it('should handle multiple cycles', () => {
      const result = phaseAtTime(28, breathInDuration, breathOutDuration);
      expect(result.phase).toBe('in');
      expect(result.phaseProgress).toBe(0);
      expect(result.cycleProgress).toBe(0);
    });

    it('should handle edge case: exactly at phase boundary', () => {
      const result = phaseAtTime(6, breathInDuration, breathOutDuration);
      expect(result.phase).toBe('out');
      expect(result.phaseProgress).toBe(0);
    });

    it('should handle invalid inputs', () => {
      const result = phaseAtTime(-1, breathInDuration, breathOutDuration);
      expect(result.phase).toBe('in');
      expect(result.phaseProgress).toBe(0);
    });
  });

  describe('nextPhaseBoundary', () => {
    it('should return end of inhale when in inhale phase', () => {
      const result = nextPhaseBoundary(3, breathInDuration, breathOutDuration);
      expect(result).toBe(6);
    });

    it('should return end of cycle when in exhale phase', () => {
      const result = nextPhaseBoundary(10, breathInDuration, breathOutDuration);
      expect(result).toBe(14);
    });

    it('should return next cycle start when exactly at boundary', () => {
      const result = nextPhaseBoundary(6, breathInDuration, breathOutDuration);
      expect(result).toBe(14);
    });

    it('should handle multiple cycles', () => {
      const result = nextPhaseBoundary(20, breathInDuration, breathOutDuration);
      // elapsed=20: cycleTime=20%14=6, we're at start of exhale, next boundary is end of cycle
      // currentCycleStart = floor(20/14)*14 = 14, next boundary = 14 + 14 = 28
      expect(result).toBe(28);
    });
  });

  describe('phaseBoundariesInRange', () => {
    it('should return boundaries in simple range', () => {
      const result = phaseBoundariesInRange(0, 14, breathInDuration, breathOutDuration);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ time: 6, phase: 'out' });
      expect(result[1]).toEqual({ time: 14, phase: 'in' });
    });

    it('should return boundaries in range spanning multiple cycles', () => {
      const result = phaseBoundariesInRange(0, 28, breathInDuration, breathOutDuration);
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ time: 6, phase: 'out' });
      expect(result[1]).toEqual({ time: 14, phase: 'in' });
      expect(result[2]).toEqual({ time: 20, phase: 'out' });
      expect(result[3]).toEqual({ time: 28, phase: 'in' });
    });

    it('should return boundaries in partial range', () => {
      const result = phaseBoundariesInRange(5, 10, breathInDuration, breathOutDuration);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ time: 6, phase: 'out' });
    });

    it('should return empty array when no boundaries in range', () => {
      const result = phaseBoundariesInRange(1, 5, breathInDuration, breathOutDuration);
      expect(result).toHaveLength(0);
    });

    it('should handle range starting at boundary', () => {
      const result = phaseBoundariesInRange(6, 14, breathInDuration, breathOutDuration);
      // Range [6, 14] includes boundary at 6 (end of inhale) and 14 (end of cycle/start of next inhale)
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ time: 6, phase: 'out' });
      expect(result[1]).toEqual({ time: 14, phase: 'in' });
    });

    it('should handle range ending at boundary', () => {
      const result = phaseBoundariesInRange(0, 6, breathInDuration, breathOutDuration);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ time: 6, phase: 'out' });
    });

    it('should return sorted boundaries', () => {
      const result = phaseBoundariesInRange(0, 30, breathInDuration, breathOutDuration);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].time).toBeGreaterThan(result[i - 1].time);
      }
    });
  });
});

