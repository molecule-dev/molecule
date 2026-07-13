import { beforeEach, describe, expect, it } from 'vitest'

import { unbond } from '@molecule/app-bond'

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
    unbond('icon-set')
  })

  describe('setIconSet / getIconSet', () => {
    it('should set and retrieve an icon set', () => {
      setIconSet(mockIconSet)
      expect(getIconSet()).toBe(mockIconSet)
    })

    it('getIconSet throws a package-specific error naming setIconSet() and a concrete bond when no icon set is bonded', () => {
      // Regression: this used to pass through @molecule/app-bond's generic
      // "No 'icon-set' provider bonded. Bond one first using bond('icon-set',
      // provider)." message, which does not tell a consumer which function
      // or package to reach for.
      expect(() => getIconSet()).toThrow('@molecule/app-icons')
      expect(() => getIconSet()).toThrow('setIconSet()')
      expect(() => getIconSet()).toThrow('@molecule/app-icons-molecule')
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
