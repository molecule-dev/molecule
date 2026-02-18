import { beforeEach, describe, expect, it } from 'vitest'

import { getIcon, getIconSet, hasIconSet, setIconSet } from '../provider.js'
import type { IconSet } from '../types.js'

const mockIconSet: IconSet = {
  'test-icon': {
    paths: [{ d: 'M0 0h24v24H0z' }],
  },
  'stroke-icon': {
    paths: [{ d: 'M6 18L18 6' }],
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
}

describe('icon provider', () => {
  beforeEach(() => {
    // Reset by setting undefined - access the module internals
    // We'll use setIconSet with a fresh set each time
  })

  describe('setIconSet / getIconSet', () => {
    it('should set and retrieve an icon set', () => {
      setIconSet(mockIconSet)
      expect(getIconSet()).toBe(mockIconSet)
    })
  })

  describe('hasIconSet', () => {
    it('should return true when an icon set is configured', () => {
      setIconSet(mockIconSet)
      expect(hasIconSet()).toBe(true)
    })
  })

  describe('getIcon', () => {
    it('should return icon data by name', () => {
      setIconSet(mockIconSet)
      const icon = getIcon('test-icon')
      expect(icon.paths).toHaveLength(1)
      expect(icon.paths[0].d).toBe('M0 0h24v24H0z')
    })

    it('should return stroke icon data', () => {
      setIconSet(mockIconSet)
      const icon = getIcon('stroke-icon')
      expect(icon.fill).toBe('none')
      expect(icon.stroke).toBe('currentColor')
      expect(icon.strokeWidth).toBe(2)
      expect(icon.viewBox).toBe('0 0 24 24')
    })

    it('should throw for unknown icon name', () => {
      setIconSet(mockIconSet)
      expect(() => getIcon('nonexistent')).toThrow('Icon "nonexistent" not found')
    })
  })
})
