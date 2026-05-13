import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createCSSVariablesThemeProvider, darkTheme, lightTheme } from '../index.js'

interface StubElement {
  style: { setProperty: ReturnType<typeof vi.fn> }
  setAttribute: ReturnType<typeof vi.fn>
}

function makeDocumentStub(): { documentElement: StubElement } {
  return {
    documentElement: {
      style: { setProperty: vi.fn() },
      setAttribute: vi.fn(),
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createCSSVariablesThemeProvider', () => {
  describe('factory + getTheme', () => {
    it('returns a provider implementing the ThemeProvider shape', () => {
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
      })
      expect(typeof provider.getTheme).toBe('function')
      expect(typeof provider.setTheme).toBe('function')
      expect(typeof provider.toggleMode).toBe('function')
      expect(typeof provider.subscribe).toBe('function')
      expect(typeof provider.getThemes).toBe('function')
    })

    it('getTheme returns the defaultTheme when found by name', () => {
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'dark',
        applyToDocument: false,
      })
      expect(provider.getTheme()).toBe(darkTheme)
    })

    it('getTheme falls back to themes[0] when defaultTheme not found', () => {
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'nonexistent',
        applyToDocument: false,
      })
      expect(provider.getTheme()).toBe(lightTheme)
    })

    it('getThemes returns the supplied themes array', () => {
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
      })
      expect(provider.getThemes()).toEqual([lightTheme, darkTheme])
    })
  })

  describe('setTheme', () => {
    it('accepts a theme name (string)', () => {
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
      })
      provider.setTheme('dark')
      expect(provider.getTheme()).toBe(darkTheme)
    })

    it('accepts a theme object directly', () => {
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
      })
      provider.setTheme(darkTheme)
      expect(provider.getTheme()).toBe(darkTheme)
    })

    it('is a no-op when called with an unknown theme name', () => {
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
      })
      provider.setTheme('does-not-exist')
      expect(provider.getTheme()).toBe(lightTheme)
    })
  })

  describe('toggleMode', () => {
    it('flips light → dark', () => {
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
      })
      provider.toggleMode()
      expect(provider.getTheme()).toBe(darkTheme)
    })

    it('flips dark → light', () => {
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'dark',
        applyToDocument: false,
      })
      provider.toggleMode()
      expect(provider.getTheme()).toBe(lightTheme)
    })

    it('is a no-op when no theme of the other mode exists', () => {
      // Only light themes — toggling should not change anything.
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme],
        defaultTheme: 'light',
        applyToDocument: false,
      })
      provider.toggleMode()
      expect(provider.getTheme()).toBe(lightTheme)
    })
  })

  describe('subscribe', () => {
    it('fires the callback on setTheme', () => {
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
      })
      const cb = vi.fn()
      provider.subscribe(cb)
      provider.setTheme('dark')
      expect(cb).toHaveBeenCalledTimes(1)
      expect(cb).toHaveBeenCalledWith(darkTheme)
    })

    it('does not fire the callback when setTheme is a no-op', () => {
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
      })
      const cb = vi.fn()
      provider.subscribe(cb)
      provider.setTheme('unknown')
      expect(cb).not.toHaveBeenCalled()
    })

    it('returns an unsubscribe function that stops further callbacks', () => {
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
      })
      const cb = vi.fn()
      const unsubscribe = provider.subscribe(cb)
      provider.setTheme('dark')
      unsubscribe()
      provider.setTheme('light')
      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('supports multiple independent subscribers', () => {
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
      })
      const a = vi.fn()
      const b = vi.fn()
      provider.subscribe(a)
      provider.subscribe(b)
      provider.setTheme('dark')
      expect(a).toHaveBeenCalledTimes(1)
      expect(b).toHaveBeenCalledTimes(1)
    })
  })

  describe('persistence via supplied storage adapter', () => {
    function makeStorage(initial: Record<string, string> = {}): {
      getItem: ReturnType<typeof vi.fn>
      setItem: ReturnType<typeof vi.fn>
      state: Record<string, string>
    } {
      const state = { ...initial }
      return {
        getItem: vi.fn((k: string) => state[k] ?? null),
        setItem: vi.fn((k: string, v: string) => {
          state[k] = v
        }),
        state,
      }
    }

    it('persistKey + storage: writes the new theme name on setTheme', () => {
      const storage = makeStorage()
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
        persistKey: 'mol-theme',
        storage,
      })
      provider.setTheme('dark')
      expect(storage.setItem).toHaveBeenCalledWith('mol-theme', 'dark')
    })

    it('persistKey + storage: restores from storage on init', () => {
      const storage = makeStorage({ 'mol-theme': 'dark' })
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
        persistKey: 'mol-theme',
        storage,
      })
      expect(provider.getTheme()).toBe(darkTheme)
    })

    it('persistKey + storage: invalid stored value falls back to defaultTheme', () => {
      const storage = makeStorage({ 'mol-theme': 'unknown-theme' })
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
        persistKey: 'mol-theme',
        storage,
      })
      expect(provider.getTheme()).toBe(lightTheme)
    })

    it('no persistKey: setItem is never called', () => {
      const storage = makeStorage()
      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
        storage,
      })
      provider.setTheme('dark')
      expect(storage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('persistence via globalThis.localStorage fallback', () => {
    it('uses globalThis.localStorage when persistKey is set but no storage adapter is supplied', () => {
      const localStorageStub = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
      }
      vi.stubGlobal('localStorage', localStorageStub)

      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
        persistKey: 'mol-theme',
      })
      provider.setTheme('dark')
      expect(localStorageStub.setItem).toHaveBeenCalledWith('mol-theme', 'dark')
    })

    it('partial localStorage shim (missing setItem) is rejected: no setItem calls', () => {
      const partial = {
        getItem: vi.fn().mockReturnValue(null),
        // setItem deliberately absent
      }
      vi.stubGlobal('localStorage', partial)

      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
        persistKey: 'mol-theme',
      })
      // Should not throw; just silently skip persistence.
      provider.setTheme('dark')
      expect(provider.getTheme()).toBe(darkTheme)
    })
  })

  describe('DOM application (applyToDocument=true)', () => {
    it('sets CSS custom properties for every theme token category', () => {
      const docStub = makeDocumentStub()
      vi.stubGlobal('document', docStub)

      createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: true,
      })

      const setProp = docStub.documentElement.style.setProperty
      // At least one color, one spacing, one font-family, one font-size, etc.
      const calls = setProp.mock.calls.map((c) => c[0] as string)
      expect(calls.some((c) => c.startsWith('--mol-color-'))).toBe(true)
      expect(calls.some((c) => c.startsWith('--mol-spacing-'))).toBe(true)
      expect(calls.some((c) => c.startsWith('--mol-radius-'))).toBe(true)
      expect(calls.some((c) => c.startsWith('--mol-shadow-'))).toBe(true)
      expect(calls.some((c) => c.startsWith('--mol-font-'))).toBe(true)
      expect(calls.some((c) => c.startsWith('--mol-text-'))).toBe(true)
      expect(calls.some((c) => c.startsWith('--mol-leading-'))).toBe(true)
      expect(calls.some((c) => c.startsWith('--mol-z-'))).toBe(true)
    })

    it('sets data-{prefix}-theme + data-{prefix}-mode attributes', () => {
      const docStub = makeDocumentStub()
      vi.stubGlobal('document', docStub)

      createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'dark',
        applyToDocument: true,
      })

      expect(docStub.documentElement.setAttribute).toHaveBeenCalledWith('data-mol-theme', 'dark')
      expect(docStub.documentElement.setAttribute).toHaveBeenCalledWith('data-mol-mode', 'dark')
    })

    it('honours custom prefix in CSS var names and data-attrs', () => {
      const docStub = makeDocumentStub()
      vi.stubGlobal('document', docStub)

      createCSSVariablesThemeProvider({
        themes: [lightTheme],
        defaultTheme: 'light',
        applyToDocument: true,
        prefix: 'acme',
      })

      const setProp = docStub.documentElement.style.setProperty
      const calls = setProp.mock.calls.map((c) => c[0] as string)
      expect(calls.some((c) => c.startsWith('--acme-color-'))).toBe(true)
      expect(docStub.documentElement.setAttribute).toHaveBeenCalledWith('data-acme-theme', 'light')
    })

    it('converts camelCase color keys to kebab-case CSS var names', () => {
      const docStub = makeDocumentStub()
      vi.stubGlobal('document', docStub)

      createCSSVariablesThemeProvider({
        themes: [lightTheme],
        defaultTheme: 'light',
        applyToDocument: true,
      })

      const setProp = docStub.documentElement.style.setProperty
      const colorCalls = setProp.mock.calls.filter((c) =>
        (c[0] as string).startsWith('--mol-color-'),
      )
      // backgroundSecondary should land as --mol-color-background-secondary
      expect(colorCalls.some((c) => c[0] === '--mol-color-background-secondary')).toBe(true)
    })

    it('applyToDocument=false skips all DOM writes', () => {
      const docStub = makeDocumentStub()
      vi.stubGlobal('document', docStub)

      createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
      })

      expect(docStub.documentElement.style.setProperty).not.toHaveBeenCalled()
      expect(docStub.documentElement.setAttribute).not.toHaveBeenCalled()
    })

    it('re-applies the theme to the document on setTheme', () => {
      const docStub = makeDocumentStub()
      vi.stubGlobal('document', docStub)

      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: true,
      })
      const initial = docStub.documentElement.style.setProperty.mock.calls.length

      provider.setTheme('dark')

      expect(docStub.documentElement.style.setProperty.mock.calls.length).toBeGreaterThan(initial)
      // data-mol-mode should now be 'dark'
      expect(docStub.documentElement.setAttribute).toHaveBeenCalledWith('data-mol-mode', 'dark')
    })

    it('skips DOM apply when document is undefined (SSR)', () => {
      // document is not stubbed → applyToDocument is true → guard returns early
      // No errors should fire.
      expect(() =>
        createCSSVariablesThemeProvider({
          themes: [lightTheme, darkTheme],
          defaultTheme: 'light',
          applyToDocument: true,
        }),
      ).not.toThrow()
    })
  })
})
