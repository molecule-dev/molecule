import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createCSSVariablesThemeProvider, darkTheme, lightTheme } from '../index.js'

interface StubElement {
  style: { setProperty: ReturnType<typeof vi.fn> }
  setAttribute: ReturnType<typeof vi.fn>
  classList: { toggle: ReturnType<typeof vi.fn> }
}

interface StubStyle {
  id: string
  textContent: string
  remove: ReturnType<typeof vi.fn>
}

interface StubDocument {
  documentElement: StubElement
  head: {
    firstChild: unknown
    insertBefore: ReturnType<typeof vi.fn>
  }
  createElement: ReturnType<typeof vi.fn>
  getElementById: ReturnType<typeof vi.fn>
  /** Last `<style>` element handed back from createElement (or the existing one). */
  styleEl: StubStyle | null
}

function makeDocumentStub(): StubDocument {
  const doc: StubDocument = {
    documentElement: {
      style: { setProperty: vi.fn() },
      setAttribute: vi.fn(),
      classList: { toggle: vi.fn() },
    },
    head: {
      firstChild: null,
      insertBefore: vi.fn(),
    },
    createElement: vi.fn((_tag: string) => {
      const el: StubStyle = { id: '', textContent: '', remove: vi.fn() }
      doc.styleEl = el
      return el
    }),
    getElementById: vi.fn((id: string) => (doc.styleEl?.id === id ? doc.styleEl : null)),
    styleEl: null,
  }
  return doc
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
    it('injects a <style> element with every theme token category', () => {
      const docStub = makeDocumentStub()
      vi.stubGlobal('document', docStub)

      createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: true,
      })

      expect(docStub.createElement).toHaveBeenCalledWith('style')
      expect(docStub.styleEl?.id).toBe('mol-theme-vars')
      const css = docStub.styleEl?.textContent ?? ''
      // At least one of each token category present in the injected stylesheet.
      expect(css).toMatch(/--mol-color-/)
      expect(css).toMatch(/--mol-spacing-/)
      expect(css).toMatch(/--mol-radius-/)
      expect(css).toMatch(/--mol-shadow-/)
      expect(css).toMatch(/--mol-font-/)
      expect(css).toMatch(/--mol-text-/)
      expect(css).toMatch(/--mol-leading-/)
      expect(css).toMatch(/--mol-z-/)
    })

    it('uses zero-specificity :where() selectors so per-app theme.css wins', () => {
      const docStub = makeDocumentStub()
      vi.stubGlobal('document', docStub)

      createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: true,
      })

      const css = docStub.styleEl?.textContent ?? ''
      // Baseline rule for :root and a rule per mode, all wrapped in :where().
      expect(css).toMatch(/:where\(:root\)/)
      expect(css).toMatch(/:where\(\[data-mol-mode="dark"\]\)/)
      expect(css).toMatch(/:where\(\[data-mol-mode="light"\]\)/)
      // No raw (specificity-bearing) selector escapes the :where() wrapper.
      const stripped = css.replace(/:where\([^)]+\)/g, '')
      expect(stripped).not.toMatch(/\[data-mol-mode/)
      expect(stripped).not.toMatch(/:root/)
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

      expect(docStub.styleEl?.id).toBe('acme-theme-vars')
      const css = docStub.styleEl?.textContent ?? ''
      expect(css).toMatch(/--acme-color-/)
      expect(css).toMatch(/:where\(\[data-acme-mode="light"\]\)/)
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

      const css = docStub.styleEl?.textContent ?? ''
      // backgroundSecondary should land as --mol-color-background-secondary
      expect(css).toMatch(/--mol-color-background-secondary:/)
    })

    it('applyToDocument=false skips all DOM writes', () => {
      const docStub = makeDocumentStub()
      vi.stubGlobal('document', docStub)

      createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: false,
      })

      expect(docStub.createElement).not.toHaveBeenCalled()
      expect(docStub.documentElement.setAttribute).not.toHaveBeenCalled()
    })

    it('re-uses the same <style> element on setTheme (does not stack)', () => {
      const docStub = makeDocumentStub()
      vi.stubGlobal('document', docStub)

      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: true,
      })

      expect(docStub.createElement).toHaveBeenCalledTimes(1)
      provider.setTheme('dark')
      // Same element re-used — getElementById returned it on the 2nd apply.
      expect(docStub.createElement).toHaveBeenCalledTimes(1)
      // data-mol-mode should now be 'dark'
      expect(docStub.documentElement.setAttribute).toHaveBeenCalledWith('data-mol-mode', 'dark')
    })

    it('toggles `.dark` class on <html> in lockstep with theme mode', () => {
      const docStub = makeDocumentStub()
      vi.stubGlobal('document', docStub)

      const provider = createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        applyToDocument: true,
      })

      // Initial light apply removes the class.
      expect(docStub.documentElement.classList.toggle).toHaveBeenCalledWith('dark', false)

      provider.setTheme('dark')
      expect(docStub.documentElement.classList.toggle).toHaveBeenCalledWith('dark', true)

      provider.setTheme('light')
      // Most recent call should be the removal.
      const calls = docStub.documentElement.classList.toggle.mock.calls
      expect(calls[calls.length - 1]).toEqual(['dark', false])
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
