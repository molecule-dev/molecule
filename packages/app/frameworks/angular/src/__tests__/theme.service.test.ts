import { firstValueFrom } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Theme, ThemeProvider } from '@molecule/app-theme'

vi.mock('@angular/core', () => ({
  Injectable: () => (target: unknown) => target,
  Inject: () => () => undefined,
  InjectionToken: class InjectionToken {
    _desc: string
    constructor(desc: string) {
      this._desc = desc
    }
  },
}))

vi.mock('@molecule/app-auth', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-http', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-i18n', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-routing', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-state', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-storage', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-theme', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))

import { MoleculeThemeService } from '../services/theme.service.js'
import { createTestTheme, createTestThemeProvider } from './helpers/test-providers.js'

describe('MoleculeThemeService', () => {
  let service: MoleculeThemeService
  let mockProvider: ThemeProvider
  let subscribeCallback: ((theme: Theme) => void) | null

  const lightTheme = createTestTheme('light', 'light')
  const darkTheme = createTestTheme('dark', 'dark')

  beforeEach(() => {
    subscribeCallback = null

    mockProvider = createTestThemeProvider(lightTheme)
    vi.mocked(mockProvider.getThemes!).mockReturnValue([lightTheme, darkTheme])
    vi.mocked(mockProvider.subscribe).mockImplementation((listener) => {
      subscribeCallback = listener
      return () => {
        subscribeCallback = null
      }
    })

    service = new MoleculeThemeService(mockProvider)
  })

  describe('constructor', () => {
    it('should initialize theme$ with the current theme', async () => {
      const theme = await firstValueFrom(service.theme$)
      expect(theme).toEqual(lightTheme)
    })

    it('should initialize themeName$ with the current theme name', async () => {
      const name = await firstValueFrom(service.themeName$)
      expect(name).toBe('light')
    })

    it('should initialize mode$ derived from theme', async () => {
      const mode = await firstValueFrom(service.mode$)
      expect(mode).toBe('light')
    })

    it('should subscribe to theme changes', () => {
      expect(mockProvider.subscribe).toHaveBeenCalledTimes(1)
    })
  })

  describe('reactive state updates', () => {
    it('should update theme$ when theme changes', () => {
      const themes: Theme[] = []
      service.theme$.subscribe((t) => themes.push(t))

      vi.mocked(mockProvider.getTheme).mockReturnValue(darkTheme)
      subscribeCallback!(darkTheme)

      expect(themes).toHaveLength(2)
      expect(themes[1]).toEqual(darkTheme)
    })

    it('should update themeName$ when theme changes', () => {
      const names: string[] = []
      service.themeName$.subscribe((n) => names.push(n))

      vi.mocked(mockProvider.getTheme).mockReturnValue(darkTheme)
      subscribeCallback!(darkTheme)

      expect(names).toHaveLength(2)
      expect(names[1]).toBe('dark')
    })

    it('should update mode$ when theme changes', () => {
      const modes: string[] = []
      service.mode$.subscribe((m) => modes.push(m))

      vi.mocked(mockProvider.getTheme).mockReturnValue(darkTheme)
      subscribeCallback!(darkTheme)

      expect(modes).toHaveLength(2)
      expect(modes[1]).toBe('dark')
    })

    it('should deduplicate mode$ emissions with distinctUntilChanged', () => {
      const modes: string[] = []
      service.mode$.subscribe((m) => modes.push(m))

      // Different theme object, same mode
      const anotherLightTheme = createTestTheme('light-alt', 'light', { background: '#fafafa' })
      vi.mocked(mockProvider.getTheme).mockReturnValue(anotherLightTheme)
      subscribeCallback!(anotherLightTheme)

      // mode is still 'light', so no new emission
      expect(modes).toHaveLength(1)
    })
  })

  describe('synchronous getters', () => {
    it('should return current theme snapshot', () => {
      expect(service.theme).toEqual(lightTheme)
    })

    it('should return current theme name snapshot', () => {
      expect(service.themeName).toBe('light')
    })

    it('should return available themes', () => {
      expect(service.themes).toEqual([lightTheme, darkTheme])
    })

    it('should return empty array when getThemes is not available', () => {
      mockProvider.getThemes = undefined
      expect(service.themes).toEqual([])
    })
  })

  describe('setTheme', () => {
    it('should delegate to the provider', () => {
      service.setTheme('dark')
      expect(mockProvider.setTheme).toHaveBeenCalledWith('dark')
    })
  })

  describe('toggleTheme', () => {
    it('should cycle to the next theme', () => {
      service.toggleTheme()

      // Current theme is 'light' (index 0), next should be 'dark' (index 1)
      expect(mockProvider.setTheme).toHaveBeenCalledWith(darkTheme)
    })

    it('should wrap around to the first theme', () => {
      // Set current theme to 'dark' (last in list)
      vi.mocked(mockProvider.getTheme).mockReturnValue(darkTheme)

      service.toggleTheme()

      // Should wrap to 'light' (index 0)
      expect(mockProvider.setTheme).toHaveBeenCalledWith(lightTheme)
    })

    it('should handle single theme gracefully', () => {
      vi.mocked(mockProvider.getThemes!).mockReturnValue([lightTheme])

      service.toggleTheme()

      // With one theme, toggling returns to the same theme
      expect(mockProvider.setTheme).toHaveBeenCalledWith(lightTheme)
    })

    it('should handle current theme not found in list', () => {
      const unknownTheme = createTestTheme('unknown', 'light')
      vi.mocked(mockProvider.getTheme).mockReturnValue(unknownTheme)

      service.toggleTheme()

      // findIndex returns -1, (-1 + 1) % 2 = 0, so it selects lightTheme
      expect(mockProvider.setTheme).toHaveBeenCalledWith(lightTheme)
    })
  })

  describe('ngOnDestroy', () => {
    it('should unsubscribe from theme changes', () => {
      expect(subscribeCallback).not.toBeNull()
      service.ngOnDestroy()
      expect(subscribeCallback).toBeNull()
    })

    it('should complete all subjects', () => {
      const completeSpy1 = vi.fn()
      const completeSpy2 = vi.fn()
      service.theme$.subscribe({ complete: completeSpy1 })
      service.themeName$.subscribe({ complete: completeSpy2 })

      service.ngOnDestroy()

      expect(completeSpy1).toHaveBeenCalledTimes(1)
      expect(completeSpy2).toHaveBeenCalledTimes(1)
    })

    it('should handle being called multiple times', () => {
      service.ngOnDestroy()
      expect(() => service.ngOnDestroy()).not.toThrow()
    })
  })
})
