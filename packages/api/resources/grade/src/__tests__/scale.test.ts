import { describe, expect, it } from 'vitest'

import { defaultGradeScale, resolveLetter, resolveRung, toPercent } from '../scale.js'

describe('@molecule/api-resource-grade scale', () => {
  describe('toPercent', () => {
    it('computes percent correctly', () => {
      expect(toPercent(85, 100)).toBe(85)
      expect(toPercent(7, 10)).toBe(70)
      expect(toPercent(0, 100)).toBe(0)
    })

    it('returns null when maxPoints <= 0', () => {
      expect(toPercent(50, 0)).toBe(null)
      expect(toPercent(50, -10)).toBe(null)
    })
  })

  describe('resolveRung / resolveLetter on the default scale', () => {
    it('matches the highest threshold first', () => {
      expect(resolveLetter(100, defaultGradeScale)).toBe('A')
      expect(resolveLetter(93, defaultGradeScale)).toBe('A')
      expect(resolveLetter(92.99, defaultGradeScale)).toBe('A-')
      expect(resolveLetter(90, defaultGradeScale)).toBe('A-')
      expect(resolveLetter(85, defaultGradeScale)).toBe('B')
      expect(resolveLetter(60, defaultGradeScale)).toBe('D')
      expect(resolveLetter(59.99, defaultGradeScale)).toBe('F')
      expect(resolveLetter(0, defaultGradeScale)).toBe('F')
    })

    it('returns the rung object including gpaPoints', () => {
      const rung = resolveRung(95, defaultGradeScale)
      expect(rung?.letter).toBe('A')
      expect(rung?.gpaPoints).toBe(4.0)
    })
  })

  describe('resolveLetter with custom scale', () => {
    it('handles unsorted scales', () => {
      const scale = {
        name: 'unsorted',
        rungs: [
          { letter: 'F', minPercent: 0, gpaPoints: 0 },
          { letter: 'A', minPercent: 90, gpaPoints: 4 },
          { letter: 'B', minPercent: 80, gpaPoints: 3 },
        ],
      }
      expect(resolveLetter(95, scale)).toBe('A')
      expect(resolveLetter(85, scale)).toBe('B')
      expect(resolveLetter(50, scale)).toBe('F')
    })

    it('returns null when scale has no rungs', () => {
      expect(resolveLetter(50, { name: 'empty', rungs: [] })).toBe(null)
    })

    it('returns null when no rung threshold is met', () => {
      const scale = {
        name: 'high-only',
        rungs: [{ letter: 'A', minPercent: 90, gpaPoints: 4 }],
      }
      expect(resolveLetter(50, scale)).toBe(null)
    })
  })
})
