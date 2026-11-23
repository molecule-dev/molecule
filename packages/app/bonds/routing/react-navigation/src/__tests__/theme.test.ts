/**
 * The React Navigation theme follows the bonded molecule theme provider.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Theme, ThemeProvider } from '@molecule/app-theme'
import { darkTheme, lightTheme, setProvider } from '@molecule/app-theme'

/** What the mocked React saw: the store the hook subscribed to. */
const react = vi.hoisted(() => ({
  subscribe: undefined as undefined | ((listener: () => void) => () => void),
}))

// One synchronous render: useSyncExternalStore reads the snapshot and records the subscription.
vi.mock('react', () => ({
  useMemo: (fn: () => unknown) => fn(),
  useSyncExternalStore: (
    subscribe: (listener: () => void) => () => void,
    getSnapshot: () => unknown,
  ) => {
    react.subscribe = subscribe
    return getSnapshot()
  },
}))

import { toNavigationTheme, useNavigationTheme } from '../theme.js'

/** React Navigation's own DefaultTheme and DarkTheme shapes (v7), fonts included. */
const fonts = { regular: { fontFamily: 'System', fontWeight: '400' as const } }
const bases = {
  light: {
    dark: false,
    colors: {
      primary: 'rgb(0, 122, 255)',
      background: 'rgb(242, 242, 242)',
      card: 'rgb(255, 255, 255)',
      text: 'rgb(28, 28, 30)',
      border: 'rgb(216, 216, 216)',
      notification: 'rgb(255, 59, 48)',
    },
    fonts,
  },
  dark: {
    dark: true,
    colors: {
      primary: 'rgb(10, 132, 255)',
      background: 'rgb(1, 1, 1)',
      card: 'rgb(18, 18, 18)',
      text: 'rgb(229, 229, 231)',
      border: 'rgb(39, 39, 41)',
      notification: 'rgb(255, 69, 58)',
    },
    fonts,
  },
}

/**
 * A minimal theme provider over two themes.
 *
 * @param initial - The starting theme.
 * @returns The provider.
 */
function createProvider(initial: Theme): ThemeProvider {
  let theme = initial
  const listeners = new Set<(theme: Theme) => void>()
  return {
    getTheme: () => theme,
    setTheme: (next) => {
      theme = typeof next === 'string' ? (next === 'dark' ? darkTheme : lightTheme) : next
      for (const listener of listeners) listener(theme)
    },
    toggleMode: () => undefined,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

afterEach(() => {
  react.subscribe = undefined
})

describe('toNavigationTheme', () => {
  it('lays the molecule colours over the base for the theme mode, keeping its fonts', () => {
    const light = toNavigationTheme(lightTheme, bases)
    expect(light).toEqual({
      dark: false,
      colors: {
        primary: lightTheme.colors.primary,
        background: lightTheme.colors.background,
        card: lightTheme.colors.surface,
        text: lightTheme.colors.text,
        border: lightTheme.colors.border,
        notification: lightTheme.colors.error,
      },
      fonts,
    })
    const dark = toNavigationTheme(darkTheme, bases)
    expect(dark.dark).toBe(true)
    expect(dark.colors.background).toBe(darkTheme.colors.background)
    expect(dark.colors.card).toBe(darkTheme.colors.surface)
    expect(dark.fonts).toBe(fonts)
  })
})

describe('useNavigationTheme', () => {
  it('returns the light base when no theme provider is bonded', () => {
    expect(useNavigationTheme(bases)).toBe(bases.light)
  })

  it('follows the bonded provider, re-reading only on a change', () => {
    const provider = createProvider(lightTheme)
    setProvider(provider)
    expect(useNavigationTheme(bases).colors.background).toBe(lightTheme.colors.background)

    const rendered: string[] = []
    const unsubscribe = react.subscribe?.(() =>
      rendered.push(useNavigationTheme(bases).colors.background),
    )
    provider.setTheme('dark')
    expect(rendered).toEqual([darkTheme.colors.background])
    expect(useNavigationTheme(bases).dark).toBe(true)

    // A custom theme's colours reach the navigator too.
    const brand: Theme = {
      ...lightTheme,
      name: 'brand',
      colors: { ...lightTheme.colors, primary: '#aa286b' },
    }
    provider.setTheme(brand)
    expect(useNavigationTheme(bases)).toMatchObject({ dark: false, colors: { primary: '#aa286b' } })

    unsubscribe?.()
    provider.setTheme('dark')
    expect(rendered).toHaveLength(2)
  })
})
