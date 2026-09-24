// @vitest-environment happy-dom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real CSS-variables bond
 * against happy-dom's real document and localStorage.
 *
 * @module
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { createCSSVariablesThemeProvider } from '@molecule/app-theme-css-variables'

import { darkTheme, getProvider, lightTheme, setProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('applies the light theme, toggles to dark, notifies subscribers and persists the choice', () => {
    setProvider(
      createCSSVariablesThemeProvider({
        themes: [lightTheme, darkTheme],
        defaultTheme: 'light',
        systemDefault: true,
        persistKey: 'app-theme',
      }),
    )
    expect(document.documentElement.getAttribute('data-mol-mode')).toBe('light')

    const theme = getProvider()
    const seen: Array<[string, string]> = []
    const unsubscribe = theme?.subscribe((next) => seen.push([next.mode, next.colors.background]))

    theme?.toggleMode()
    expect(seen).toEqual([['dark', darkTheme.colors.background]])
    expect(document.documentElement.getAttribute('data-mol-mode')).toBe('dark')
    expect(localStorage.getItem('app-theme')).toBe('dark')

    unsubscribe?.()
    theme?.toggleMode()
    expect(seen).toHaveLength(1)
    expect(theme?.getTheme().mode).toBe('light')
  })
})
