import { describe, expect, it } from 'vitest'

import { darkTheme, lightTheme } from '../themes.js'

describe('@molecule/app-theme-css-variables-liquid-glass', () => {
  describe('lightTheme', () => {
    it('has name and mode', () => {
      expect(lightTheme.name).toBe('light')
      expect(lightTheme.mode).toBe('light')
    })

    it('has translucent surface colors', () => {
      expect(lightTheme.colors.surface).toContain('rgba')
      expect(lightTheme.colors.surfaceSecondary).toContain('rgba')
    })

    it('has all required color tokens', () => {
      const requiredKeys = [
        'background',
        'backgroundSecondary',
        'backgroundTertiary',
        'surface',
        'surfaceSecondary',
        'inputBackground',
        'text',
        'textSecondary',
        'textTertiary',
        'textInverse',
        'primary',
        'primaryLight',
        'primaryDark',
        'secondary',
        'secondaryLight',
        'secondaryDark',
        'success',
        'successLight',
        'warning',
        'warningLight',
        'error',
        'errorLight',
        'info',
        'infoLight',
        'border',
        'borderSecondary',
        'borderFocus',
        'overlay',
        'shadow',
      ]
      for (const key of requiredKeys) {
        expect(lightTheme.colors).toHaveProperty(key)
      }
    })

    it('has rounded border radii', () => {
      expect(parseInt(lightTheme.borderRadius.md)).toBeGreaterThanOrEqual(12)
    })
  })

  describe('darkTheme', () => {
    it('has name and mode', () => {
      expect(darkTheme.name).toBe('dark')
      expect(darkTheme.mode).toBe('dark')
    })

    it('has translucent surface colors', () => {
      expect(darkTheme.colors.surface).toContain('rgba')
      expect(darkTheme.colors.surfaceSecondary).toContain('rgba')
    })

    it('has all required color tokens', () => {
      const requiredKeys = [
        'background',
        'backgroundSecondary',
        'backgroundTertiary',
        'surface',
        'surfaceSecondary',
        'inputBackground',
        'text',
        'textSecondary',
        'textTertiary',
        'textInverse',
        'primary',
        'primaryLight',
        'primaryDark',
        'secondary',
        'secondaryLight',
        'secondaryDark',
        'success',
        'successLight',
        'warning',
        'warningLight',
        'error',
        'errorLight',
        'info',
        'infoLight',
        'border',
        'borderSecondary',
        'borderFocus',
        'overlay',
        'shadow',
      ]
      for (const key of requiredKeys) {
        expect(darkTheme.colors).toHaveProperty(key)
      }
    })
  })
})
