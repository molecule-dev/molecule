import { describe, expect, it } from 'vitest'

import {
  createDarkTheme,
  // Utility functions
  createLightTheme,
  darkColors,
  darkTheme,
  defaultBorderRadius,
  defaultBreakpoints,
  defaultShadows,
  defaultSpacing,
  defaultTransitions,
  defaultTypography,
  defaultZIndex,
  // Default theme values
  lightColors,
  lightTheme,
  // Types (imported for type checking)
  type Theme,
  type ThemeBorderRadius,
  type ThemeBreakpoints,
  type ThemeColors,
  type ThemeProvider,
  type ThemeShadows,
  type ThemeSpacing,
  type ThemeTransitions,
  type ThemeTypography,
  type ThemeZIndex,
} from '../index.js'

describe('Theme Module', () => {
  describe('lightColors', () => {
    it('should have all required color properties', () => {
      // Base colors
      expect(lightColors.background).toBe('#ffffff')
      expect(lightColors.backgroundSecondary).toBe('#f5f5f5')
      expect(lightColors.backgroundTertiary).toBe('#eeeeee')
      expect(lightColors.surface).toBe('#ffffff')
      expect(lightColors.surfaceSecondary).toBe('#fafafa')
    })

    it('should have all text colors', () => {
      expect(lightColors.text).toBe('#1a1a1a')
      expect(lightColors.textSecondary).toBe('#666666')
      expect(lightColors.textTertiary).toBe('#999999')
      expect(lightColors.textInverse).toBe('#ffffff')
    })

    it('should have brand colors', () => {
      expect(lightColors.primary).toBe('#0066cc')
      expect(lightColors.primaryLight).toBe('#3399ff')
      expect(lightColors.primaryDark).toBe('#004d99')
      expect(lightColors.secondary).toBe('#6c757d')
      expect(lightColors.secondaryLight).toBe('#868e96')
      expect(lightColors.secondaryDark).toBe('#495057')
    })

    it('should have semantic colors', () => {
      expect(lightColors.success).toBe('#28a745')
      expect(lightColors.successLight).toBe('#d4edda')
      expect(lightColors.warning).toBe('#ffc107')
      expect(lightColors.warningLight).toBe('#fff3cd')
      expect(lightColors.error).toBe('#dc3545')
      expect(lightColors.errorLight).toBe('#f8d7da')
      expect(lightColors.info).toBe('#17a2b8')
      expect(lightColors.infoLight).toBe('#d1ecf1')
    })

    it('should have border colors', () => {
      expect(lightColors.border).toBe('#e0e0e0')
      expect(lightColors.borderSecondary).toBe('#cccccc')
      expect(lightColors.borderFocus).toBe('#0066cc')
    })

    it('should have overlay and shadow colors', () => {
      expect(lightColors.overlay).toBe('rgba(0, 0, 0, 0.5)')
      expect(lightColors.shadow).toBe('rgba(0, 0, 0, 0.1)')
    })
  })

  describe('darkColors', () => {
    it('should have all required color properties', () => {
      // Base colors
      expect(darkColors.background).toBe('#121212')
      expect(darkColors.backgroundSecondary).toBe('#1e1e1e')
      expect(darkColors.backgroundTertiary).toBe('#2d2d2d')
      expect(darkColors.surface).toBe('#1e1e1e')
      expect(darkColors.surfaceSecondary).toBe('#252525')
    })

    it('should have all text colors', () => {
      expect(darkColors.text).toBe('#ffffff')
      expect(darkColors.textSecondary).toBe('#b3b3b3')
      expect(darkColors.textTertiary).toBe('#808080')
      expect(darkColors.textInverse).toBe('#1a1a1a')
    })

    it('should have brand colors', () => {
      expect(darkColors.primary).toBe('#3399ff')
      expect(darkColors.primaryLight).toBe('#66b3ff')
      expect(darkColors.primaryDark).toBe('#0066cc')
      expect(darkColors.secondary).toBe('#868e96')
      expect(darkColors.secondaryLight).toBe('#adb5bd')
      expect(darkColors.secondaryDark).toBe('#6c757d')
    })

    it('should have semantic colors', () => {
      expect(darkColors.success).toBe('#28a745')
      expect(darkColors.successLight).toBe('#1e4620')
      expect(darkColors.warning).toBe('#ffc107')
      expect(darkColors.warningLight).toBe('#4d3800')
      expect(darkColors.error).toBe('#dc3545')
      expect(darkColors.errorLight).toBe('#4d1a1f')
      expect(darkColors.info).toBe('#17a2b8')
      expect(darkColors.infoLight).toBe('#0d3d47')
    })

    it('should have border colors', () => {
      expect(darkColors.border).toBe('#333333')
      expect(darkColors.borderSecondary).toBe('#444444')
      expect(darkColors.borderFocus).toBe('#3399ff')
    })

    it('should have overlay and shadow colors with higher opacity', () => {
      expect(darkColors.overlay).toBe('rgba(0, 0, 0, 0.7)')
      expect(darkColors.shadow).toBe('rgba(0, 0, 0, 0.3)')
    })
  })

  describe('defaultBreakpoints', () => {
    it('should define all breakpoint sizes', () => {
      expect(defaultBreakpoints.mobileS).toBe('320px')
      expect(defaultBreakpoints.mobileM).toBe('375px')
      expect(defaultBreakpoints.mobileL).toBe('425px')
      expect(defaultBreakpoints.tablet).toBe('768px')
      expect(defaultBreakpoints.laptop).toBe('1024px')
      expect(defaultBreakpoints.laptopL).toBe('1440px')
      expect(defaultBreakpoints.desktop).toBe('2560px')
    })

    it('should have breakpoints in ascending order', () => {
      const values = [
        parseInt(defaultBreakpoints.mobileS),
        parseInt(defaultBreakpoints.mobileM),
        parseInt(defaultBreakpoints.mobileL),
        parseInt(defaultBreakpoints.tablet),
        parseInt(defaultBreakpoints.laptop),
        parseInt(defaultBreakpoints.laptopL),
        parseInt(defaultBreakpoints.desktop),
      ]

      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1])
      }
    })
  })

  describe('defaultSpacing', () => {
    it('should define all spacing sizes', () => {
      expect(defaultSpacing.xs).toBe('4px')
      expect(defaultSpacing.sm).toBe('8px')
      expect(defaultSpacing.md).toBe('16px')
      expect(defaultSpacing.lg).toBe('24px')
      expect(defaultSpacing.xl).toBe('32px')
      expect(defaultSpacing.xxl).toBe('48px')
      expect(defaultSpacing.xxxl).toBe('64px')
    })

    it('should have spacing in ascending order', () => {
      const values = [
        parseInt(defaultSpacing.xs),
        parseInt(defaultSpacing.sm),
        parseInt(defaultSpacing.md),
        parseInt(defaultSpacing.lg),
        parseInt(defaultSpacing.xl),
        parseInt(defaultSpacing.xxl),
        parseInt(defaultSpacing.xxxl),
      ]

      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1])
      }
    })
  })

  describe('defaultTypography', () => {
    describe('fontFamily', () => {
      it('should define sans-serif font stack', () => {
        expect(defaultTypography.fontFamily.sans).toContain('-apple-system')
        expect(defaultTypography.fontFamily.sans).toContain('BlinkMacSystemFont')
        expect(defaultTypography.fontFamily.sans).toContain('sans-serif')
      })

      it('should define serif font stack', () => {
        expect(defaultTypography.fontFamily.serif).toContain('Georgia')
        expect(defaultTypography.fontFamily.serif).toContain('serif')
      })

      it('should define monospace font stack', () => {
        expect(defaultTypography.fontFamily.mono).toContain('SFMono-Regular')
        expect(defaultTypography.fontFamily.mono).toContain('Menlo')
        expect(defaultTypography.fontFamily.mono).toContain('monospace')
      })
    })

    describe('fontSize', () => {
      it('should define all font sizes in rem', () => {
        expect(defaultTypography.fontSize.xs).toBe('0.75rem')
        expect(defaultTypography.fontSize.sm).toBe('0.875rem')
        expect(defaultTypography.fontSize.base).toBe('1rem')
        expect(defaultTypography.fontSize.lg).toBe('1.125rem')
        expect(defaultTypography.fontSize.xl).toBe('1.25rem')
        expect(defaultTypography.fontSize['2xl']).toBe('1.5rem')
        expect(defaultTypography.fontSize['3xl']).toBe('1.875rem')
        expect(defaultTypography.fontSize['4xl']).toBe('2.25rem')
        expect(defaultTypography.fontSize['5xl']).toBe('3rem')
      })

      it('should have font sizes in ascending order', () => {
        const values = [
          parseFloat(defaultTypography.fontSize.xs),
          parseFloat(defaultTypography.fontSize.sm),
          parseFloat(defaultTypography.fontSize.base),
          parseFloat(defaultTypography.fontSize.lg),
          parseFloat(defaultTypography.fontSize.xl),
          parseFloat(defaultTypography.fontSize['2xl']),
          parseFloat(defaultTypography.fontSize['3xl']),
          parseFloat(defaultTypography.fontSize['4xl']),
          parseFloat(defaultTypography.fontSize['5xl']),
        ]

        for (let i = 1; i < values.length; i++) {
          expect(values[i]).toBeGreaterThan(values[i - 1])
        }
      })
    })

    describe('fontWeight', () => {
      it('should define all font weights', () => {
        expect(defaultTypography.fontWeight.light).toBe(300)
        expect(defaultTypography.fontWeight.normal).toBe(400)
        expect(defaultTypography.fontWeight.medium).toBe(500)
        expect(defaultTypography.fontWeight.semibold).toBe(600)
        expect(defaultTypography.fontWeight.bold).toBe(700)
      })

      it('should have font weights in ascending order', () => {
        expect(defaultTypography.fontWeight.light).toBeLessThan(defaultTypography.fontWeight.normal)
        expect(defaultTypography.fontWeight.normal).toBeLessThan(
          defaultTypography.fontWeight.medium,
        )
        expect(defaultTypography.fontWeight.medium).toBeLessThan(
          defaultTypography.fontWeight.semibold,
        )
        expect(defaultTypography.fontWeight.semibold).toBeLessThan(
          defaultTypography.fontWeight.bold,
        )
      })
    })

    describe('lineHeight', () => {
      it('should define all line heights', () => {
        expect(defaultTypography.lineHeight.tight).toBe(1.25)
        expect(defaultTypography.lineHeight.normal).toBe(1.5)
        expect(defaultTypography.lineHeight.relaxed).toBe(1.75)
      })

      it('should have line heights in ascending order', () => {
        expect(defaultTypography.lineHeight.tight).toBeLessThan(defaultTypography.lineHeight.normal)
        expect(defaultTypography.lineHeight.normal).toBeLessThan(
          defaultTypography.lineHeight.relaxed,
        )
      })
    })
  })

  describe('defaultBorderRadius', () => {
    it('should define all border radius sizes', () => {
      expect(defaultBorderRadius.none).toBe('0')
      expect(defaultBorderRadius.sm).toBe('4px')
      expect(defaultBorderRadius.md).toBe('8px')
      expect(defaultBorderRadius.lg).toBe('12px')
      expect(defaultBorderRadius.xl).toBe('16px')
      expect(defaultBorderRadius.full).toBe('9999px')
    })

    it('should have border radius in ascending order (excluding none and full)', () => {
      const values = [
        parseInt(defaultBorderRadius.sm),
        parseInt(defaultBorderRadius.md),
        parseInt(defaultBorderRadius.lg),
        parseInt(defaultBorderRadius.xl),
      ]

      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1])
      }
    })
  })

  describe('defaultShadows', () => {
    it('should define all shadow values', () => {
      expect(defaultShadows.none).toBe('none')
      expect(defaultShadows.sm).toBe('0 1px 2px 0 rgba(0, 0, 0, 0.05)')
      expect(defaultShadows.md).toBe('0 4px 6px -1px rgba(0, 0, 0, 0.1)')
      expect(defaultShadows.lg).toBe('0 10px 15px -3px rgba(0, 0, 0, 0.1)')
      expect(defaultShadows.xl).toBe('0 20px 25px -5px rgba(0, 0, 0, 0.1)')
    })

    it('should have valid CSS shadow format', () => {
      // Non-none shadows should contain rgba
      expect(defaultShadows.sm).toContain('rgba')
      expect(defaultShadows.md).toContain('rgba')
      expect(defaultShadows.lg).toContain('rgba')
      expect(defaultShadows.xl).toContain('rgba')
    })
  })

  describe('defaultTransitions', () => {
    it('should define all transition values', () => {
      expect(defaultTransitions.fast).toBe('150ms ease-in-out')
      expect(defaultTransitions.normal).toBe('250ms ease-in-out')
      expect(defaultTransitions.slow).toBe('350ms ease-in-out')
    })

    it('should have transition durations in ascending order', () => {
      const getDuration = (transition: string): number => parseInt(transition.split('ms')[0])

      expect(getDuration(defaultTransitions.fast)).toBeLessThan(
        getDuration(defaultTransitions.normal),
      )
      expect(getDuration(defaultTransitions.normal)).toBeLessThan(
        getDuration(defaultTransitions.slow),
      )
    })

    it('should all use ease-in-out timing function', () => {
      expect(defaultTransitions.fast).toContain('ease-in-out')
      expect(defaultTransitions.normal).toContain('ease-in-out')
      expect(defaultTransitions.slow).toContain('ease-in-out')
    })
  })

  describe('defaultZIndex', () => {
    it('should define all z-index values', () => {
      expect(defaultZIndex.hide).toBe(-1)
      expect(defaultZIndex.base).toBe(0)
      expect(defaultZIndex.dropdown).toBe(1000)
      expect(defaultZIndex.sticky).toBe(1100)
      expect(defaultZIndex.fixed).toBe(1200)
      expect(defaultZIndex.modal).toBe(1300)
      expect(defaultZIndex.popover).toBe(1400)
      expect(defaultZIndex.tooltip).toBe(1500)
      expect(defaultZIndex.toast).toBe(1600)
    })

    it('should have z-index values in proper stacking order', () => {
      expect(defaultZIndex.hide).toBeLessThan(defaultZIndex.base)
      expect(defaultZIndex.base).toBeLessThan(defaultZIndex.dropdown)
      expect(defaultZIndex.dropdown).toBeLessThan(defaultZIndex.sticky)
      expect(defaultZIndex.sticky).toBeLessThan(defaultZIndex.fixed)
      expect(defaultZIndex.fixed).toBeLessThan(defaultZIndex.modal)
      expect(defaultZIndex.modal).toBeLessThan(defaultZIndex.popover)
      expect(defaultZIndex.popover).toBeLessThan(defaultZIndex.tooltip)
      expect(defaultZIndex.tooltip).toBeLessThan(defaultZIndex.toast)
    })
  })

  describe('lightTheme', () => {
    it('should have correct name and mode', () => {
      expect(lightTheme.name).toBe('light')
      expect(lightTheme.mode).toBe('light')
    })

    it('should use light colors', () => {
      expect(lightTheme.colors).toEqual(lightColors)
    })

    it('should use default breakpoints', () => {
      expect(lightTheme.breakpoints).toEqual(defaultBreakpoints)
    })

    it('should use default spacing', () => {
      expect(lightTheme.spacing).toEqual(defaultSpacing)
    })

    it('should use default typography', () => {
      expect(lightTheme.typography).toEqual(defaultTypography)
    })

    it('should use default border radius', () => {
      expect(lightTheme.borderRadius).toEqual(defaultBorderRadius)
    })

    it('should use default shadows', () => {
      expect(lightTheme.shadows).toEqual(defaultShadows)
    })

    it('should use default transitions', () => {
      expect(lightTheme.transitions).toEqual(defaultTransitions)
    })

    it('should use default z-index', () => {
      expect(lightTheme.zIndex).toEqual(defaultZIndex)
    })

    it('should satisfy Theme interface', () => {
      const theme: Theme = lightTheme
      expect(theme).toBeDefined()
    })
  })

  describe('darkTheme', () => {
    it('should have correct name and mode', () => {
      expect(darkTheme.name).toBe('dark')
      expect(darkTheme.mode).toBe('dark')
    })

    it('should use dark colors', () => {
      expect(darkTheme.colors).toEqual(darkColors)
    })

    it('should use default breakpoints', () => {
      expect(darkTheme.breakpoints).toEqual(defaultBreakpoints)
    })

    it('should use default spacing', () => {
      expect(darkTheme.spacing).toEqual(defaultSpacing)
    })

    it('should use default typography', () => {
      expect(darkTheme.typography).toEqual(defaultTypography)
    })

    it('should use default border radius', () => {
      expect(darkTheme.borderRadius).toEqual(defaultBorderRadius)
    })

    it('should use default shadows', () => {
      expect(darkTheme.shadows).toEqual(defaultShadows)
    })

    it('should use default transitions', () => {
      expect(darkTheme.transitions).toEqual(defaultTransitions)
    })

    it('should use default z-index', () => {
      expect(darkTheme.zIndex).toEqual(defaultZIndex)
    })

    it('should satisfy Theme interface', () => {
      const theme: Theme = darkTheme
      expect(theme).toBeDefined()
    })
  })

  describe('createLightTheme', () => {
    it('should create a light theme with default values when called without overrides', () => {
      const theme = createLightTheme()

      expect(theme.name).toBe('light')
      expect(theme.mode).toBe('light')
      expect(theme.colors).toEqual(lightColors)
      expect(theme.breakpoints).toEqual(defaultBreakpoints)
      expect(theme.spacing).toEqual(defaultSpacing)
      expect(theme.typography).toEqual(defaultTypography)
      expect(theme.borderRadius).toEqual(defaultBorderRadius)
      expect(theme.shadows).toEqual(defaultShadows)
      expect(theme.transitions).toEqual(defaultTransitions)
      expect(theme.zIndex).toEqual(defaultZIndex)
    })

    it('should allow overriding the name', () => {
      const theme = createLightTheme({ name: 'custom-light' })

      expect(theme.name).toBe('custom-light')
      expect(theme.mode).toBe('light')
    })

    it('should allow color overrides while preserving other defaults via spread', () => {
      const theme = createLightTheme({
        colors: {
          ...lightColors,
          primary: '#ff0000',
          secondary: '#00ff00',
        },
      })

      expect(theme.colors.primary).toBe('#ff0000')
      expect(theme.colors.secondary).toBe('#00ff00')
      // Other colors should use defaults when spread
      expect(theme.colors.background).toBe(lightColors.background)
    })

    it('should allow breakpoint overrides while preserving other defaults via spread', () => {
      const theme = createLightTheme({
        breakpoints: {
          ...defaultBreakpoints,
          tablet: '800px',
        },
      })

      expect(theme.breakpoints.tablet).toBe('800px')
      expect(theme.breakpoints.mobileS).toBe(defaultBreakpoints.mobileS)
    })

    it('should allow spacing overrides while preserving other defaults via spread', () => {
      const theme = createLightTheme({
        spacing: {
          ...defaultSpacing,
          md: '20px',
        },
      })

      expect(theme.spacing.md).toBe('20px')
      expect(theme.spacing.sm).toBe(defaultSpacing.sm)
    })

    it('should allow typography overrides', () => {
      const theme = createLightTheme({
        typography: {
          ...defaultTypography,
          fontFamily: {
            ...defaultTypography.fontFamily,
            sans: 'Inter, sans-serif',
          },
        },
      })

      expect(theme.typography.fontFamily.sans).toBe('Inter, sans-serif')
      // Other font families preserved
      expect(theme.typography.fontFamily.mono).toBe(defaultTypography.fontFamily.mono)
    })

    it('should allow border radius overrides while preserving other defaults via spread', () => {
      const theme = createLightTheme({
        borderRadius: {
          ...defaultBorderRadius,
          md: '10px',
        },
      })

      expect(theme.borderRadius.md).toBe('10px')
      expect(theme.borderRadius.sm).toBe(defaultBorderRadius.sm)
    })

    it('should allow shadow overrides while preserving other defaults via spread', () => {
      const theme = createLightTheme({
        shadows: {
          ...defaultShadows,
          md: '0 2px 4px rgba(0, 0, 0, 0.2)',
        },
      })

      expect(theme.shadows.md).toBe('0 2px 4px rgba(0, 0, 0, 0.2)')
      expect(theme.shadows.sm).toBe(defaultShadows.sm)
    })

    it('should allow transition overrides while preserving other defaults via spread', () => {
      const theme = createLightTheme({
        transitions: {
          ...defaultTransitions,
          fast: '100ms linear',
        },
      })

      expect(theme.transitions.fast).toBe('100ms linear')
      expect(theme.transitions.normal).toBe(defaultTransitions.normal)
    })

    it('should allow z-index overrides while preserving other defaults via spread', () => {
      const theme = createLightTheme({
        zIndex: {
          ...defaultZIndex,
          modal: 9999,
        },
      })

      expect(theme.zIndex.modal).toBe(9999)
      expect(theme.zIndex.dropdown).toBe(defaultZIndex.dropdown)
    })

    it('should replace entire sub-object when override does not spread defaults', () => {
      // This demonstrates the shallow merge behavior
      const theme = createLightTheme({
        colors: {
          primary: '#ff0000',
        } as ThemeColors,
      })

      // Only the primary color is set, others become undefined due to shallow merge
      expect(theme.colors.primary).toBe('#ff0000')
      expect(theme.colors.background).toBeUndefined()
    })

    it('should not mutate original defaults', () => {
      const originalPrimary = lightColors.primary

      createLightTheme({
        colors: {
          primary: '#ff0000',
        } as ThemeColors,
      })

      expect(lightColors.primary).toBe(originalPrimary)
    })
  })

  describe('createDarkTheme', () => {
    it('should create a dark theme with default values when called without overrides', () => {
      const theme = createDarkTheme()

      expect(theme.name).toBe('dark')
      expect(theme.mode).toBe('dark')
      expect(theme.colors).toEqual(darkColors)
      expect(theme.breakpoints).toEqual(defaultBreakpoints)
      expect(theme.spacing).toEqual(defaultSpacing)
      expect(theme.typography).toEqual(defaultTypography)
      expect(theme.borderRadius).toEqual(defaultBorderRadius)
      expect(theme.shadows).toEqual(defaultShadows)
      expect(theme.transitions).toEqual(defaultTransitions)
      expect(theme.zIndex).toEqual(defaultZIndex)
    })

    it('should allow overriding the name', () => {
      const theme = createDarkTheme({ name: 'custom-dark' })

      expect(theme.name).toBe('custom-dark')
      expect(theme.mode).toBe('dark')
    })

    it('should allow color overrides while preserving other defaults via spread', () => {
      const theme = createDarkTheme({
        colors: {
          ...darkColors,
          primary: '#00ff00',
          background: '#000000',
        },
      })

      expect(theme.colors.primary).toBe('#00ff00')
      expect(theme.colors.background).toBe('#000000')
      // Other colors should use dark defaults when spread
      expect(theme.colors.text).toBe(darkColors.text)
    })

    it('should allow breakpoint overrides while preserving other defaults via spread', () => {
      const theme = createDarkTheme({
        breakpoints: {
          ...defaultBreakpoints,
          laptop: '1200px',
        },
      })

      expect(theme.breakpoints.laptop).toBe('1200px')
      expect(theme.breakpoints.tablet).toBe(defaultBreakpoints.tablet)
    })

    it('should allow spacing overrides while preserving other defaults via spread', () => {
      const theme = createDarkTheme({
        spacing: {
          ...defaultSpacing,
          lg: '28px',
        },
      })

      expect(theme.spacing.lg).toBe('28px')
      expect(theme.spacing.md).toBe(defaultSpacing.md)
    })

    it('should replace entire sub-object when override does not spread defaults', () => {
      // This demonstrates the shallow merge behavior for dark theme
      const theme = createDarkTheme({
        colors: {
          primary: '#00ff00',
        } as ThemeColors,
      })

      // Only the primary color is set, others become undefined due to shallow merge
      expect(theme.colors.primary).toBe('#00ff00')
      expect(theme.colors.background).toBeUndefined()
    })

    it('should not mutate original defaults', () => {
      const originalPrimary = darkColors.primary

      createDarkTheme({
        colors: {
          primary: '#ff0000',
        } as ThemeColors,
      })

      expect(darkColors.primary).toBe(originalPrimary)
    })

    it('should allow overriding mode (even though unusual)', () => {
      const theme = createDarkTheme({ mode: 'light' })

      // The final spread overwrites, so mode should be 'light'
      expect(theme.mode).toBe('light')
    })
  })

  describe('Type Exports', () => {
    it('should export Theme type', () => {
      const theme: Theme = {
        name: 'test',
        mode: 'light',
        colors: lightColors,
        breakpoints: defaultBreakpoints,
        spacing: defaultSpacing,
        typography: defaultTypography,
        borderRadius: defaultBorderRadius,
        shadows: defaultShadows,
        transitions: defaultTransitions,
        zIndex: defaultZIndex,
      }
      expect(theme).toBeDefined()
    })

    it('should export ThemeColors type', () => {
      const colors: ThemeColors = lightColors
      expect(colors).toBeDefined()
    })

    it('should export ThemeBreakpoints type', () => {
      const breakpoints: ThemeBreakpoints = defaultBreakpoints
      expect(breakpoints).toBeDefined()
    })

    it('should export ThemeSpacing type', () => {
      const spacing: ThemeSpacing = defaultSpacing
      expect(spacing).toBeDefined()
    })

    it('should export ThemeTypography type', () => {
      const typography: ThemeTypography = defaultTypography
      expect(typography).toBeDefined()
    })

    it('should export ThemeBorderRadius type', () => {
      const borderRadius: ThemeBorderRadius = defaultBorderRadius
      expect(borderRadius).toBeDefined()
    })

    it('should export ThemeShadows type', () => {
      const shadows: ThemeShadows = defaultShadows
      expect(shadows).toBeDefined()
    })

    it('should export ThemeTransitions type', () => {
      const transitions: ThemeTransitions = defaultTransitions
      expect(transitions).toBeDefined()
    })

    it('should export ThemeZIndex type', () => {
      const zIndex: ThemeZIndex = defaultZIndex
      expect(zIndex).toBeDefined()
    })

    it('should export ThemeProvider type', () => {
      // ThemeProvider is an interface with methods
      const mockProvider: ThemeProvider = {
        getTheme: () => lightTheme,
        setTheme: () => {},
        toggleMode: () => {},
        subscribe: () => () => {},
      }
      expect(mockProvider).toBeDefined()
    })
  })

  describe('Theme Contrast', () => {
    it('should have distinct light and dark backgrounds', () => {
      expect(lightColors.background).not.toBe(darkColors.background)
      expect(lightColors.backgroundSecondary).not.toBe(darkColors.backgroundSecondary)
    })

    it('should have distinct light and dark text colors', () => {
      expect(lightColors.text).not.toBe(darkColors.text)
      expect(lightColors.textSecondary).not.toBe(darkColors.textSecondary)
    })

    it('should have inverse text colors that match opposite background', () => {
      // Light theme inverse text should be white (like light background)
      expect(lightColors.textInverse).toBe('#ffffff')
      // Dark theme inverse text should be dark (like dark text)
      expect(darkColors.textInverse).toBe('#1a1a1a')
    })
  })
})
