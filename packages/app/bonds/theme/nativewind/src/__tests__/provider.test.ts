/**
 * The provider against NativeWind's real device runtime: Tailwind v3 compiles the
 * ClassMap's classes with both presets for iOS, NativeWind's runtime registers
 * them, and each assertion reads the style a react-native component actually
 * received.
 *
 * @module
 */

import { createRequire } from 'node:module'

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setProvider as setStorageProvider, type StorageProvider } from '@molecule/app-storage'
import type { Theme } from '@molecule/app-theme'
import { classMap } from '@molecule/app-ui-nativewind'
import { resolveColorTokens } from '@molecule/app-ui-tailwind'

import { createNativeWindThemeProvider } from '../provider.js'
import { darkTheme, lightTheme } from '../themes.js'

vi.mock('nativewind', async () => {
  const { createRequire: create } = await import('node:module')
  return create(import.meta.url)('./helpers/native-runtime.cjs').nativewind
})
vi.mock('react-native', async () => {
  const { createRequire: create } = await import('node:module')
  return create(import.meta.url)('./helpers/react-native.cjs')
})

interface Harness {
  registerClasses(classes: string[]): Promise<void>
  styleOf(className: string, component?: string): Record<string, unknown>
  reactNative: { __setDeviceScheme(value: 'light' | 'dark'): void; __reset(): void }
}

const harness = createRequire(import.meta.url)('./helpers/native-runtime.cjs') as Harness
const { styleOf } = harness

/** Every class the ClassMap's static entries name. */
const classMapClasses = [
  ...new Set(
    Object.values(classMap as unknown as Record<string, unknown>)
      .filter((value): value is string => typeof value === 'string')
      .flatMap((value) => value.split(/\s+/))
      .filter(Boolean),
  ),
]

/**
 * The colour NativeWind paints for a token of a palette.
 *
 * @param colors - The palette.
 * @param name - The token.
 * @param alpha - An opacity modifier, when the class has one.
 * @returns The colour as react-native receives it.
 */
function paint(colors: Theme['colors'], name: string, alpha?: number): string {
  const color = resolveColorTokens(colors).get(name)
  if (!color) throw new Error(`no token ${name}`)
  const [r, g, b, a] = color
  const rgb = [r, g, b].map(Math.round).join(', ')
  if (alpha !== undefined) return `rgba(${rgb}, ${alpha})`
  return a >= 1 ? `rgb(${rgb})` : `rgba(${rgb}, ${Number(a.toFixed(3))})`
}

beforeAll(async () => {
  await harness.registerClasses([...classMapClasses, 'bg-surface dark:bg-primary', 'bg-success/25'])
})

afterEach(() => {
  harness.reactNative.__reset()
})

describe('with no theme bond', () => {
  it('paints base.css defaults from the preset alone', () => {
    // NativeWind writes the preset's :root defaults as hex.
    expect(styleOf('bg-background').backgroundColor).toBe('#f6f6f6')
    expect(styleOf('text-foreground-secondary', 'Text').color).toBe('#686868')
    expect(styleOf('bg-success/25').backgroundColor).toBe('rgba(48, 144, 0, 0.25)')
    expect(styleOf('bg-overlay').backgroundColor).toBe('#00000080')
  })
})

describe('createNativeWindThemeProvider on a device', () => {
  it('repaints every token for light, dark and a custom theme', () => {
    const provider = createNativeWindThemeProvider({
      themes: [lightTheme, darkTheme],
      defaultTheme: 'light',
    })
    const seen: string[] = []
    provider.subscribe((theme) => seen.push(theme.name))
    expect(styleOf('bg-background').backgroundColor).toBe(paint(lightTheme.colors, 'background'))

    provider.toggleMode()
    expect(provider.getTheme().mode).toBe('dark')
    expect(seen).toEqual(['dark'])
    expect(styleOf('bg-background').backgroundColor).toBe(paint(darkTheme.colors, 'background'))
    expect(styleOf('border-border').borderColor).toBe(paint(darkTheme.colors, 'border'))
    expect(styleOf('bg-success/25').backgroundColor).toBe(paint(darkTheme.colors, 'success', 0.25))
    expect(styleOf('bg-overlay').backgroundColor).toBe(paint(darkTheme.colors, 'overlay'))
    // A derived token (color-mix() on the web) follows its core tokens.
    expect(styleOf('bg-surface-container').backgroundColor).toBe(
      paint(darkTheme.colors, 'surface-container'),
    )
    // An arbitrary value that reads the variable directly, as one ClassMap entry does.
    expect(styleOf('bg-[var(--color-surface-container-lowest,white)]').backgroundColor).toBe(
      paint(darkTheme.colors, 'surface-container-lowest'),
    )
    // `dark:` follows the theme; the device setting is still light.
    expect(styleOf('bg-surface dark:bg-primary').backgroundColor).toBe(
      paint(darkTheme.colors, 'primary'),
    )

    const brand: Theme = {
      ...lightTheme,
      name: 'brand',
      colors: { ...lightTheme.colors, primary: '#aa286b', surface: '#fff8f0' },
    }
    provider.setTheme(brand)
    expect(styleOf('bg-primary').backgroundColor).toBe('rgb(170, 40, 107)')
    expect(styleOf('bg-surface dark:bg-primary').backgroundColor).toBe('rgb(255, 248, 240)')
    expect(styleOf('bg-surface-container').backgroundColor).toBe(
      paint(brand.colors, 'surface-container'),
    )
    provider.setTheme('light')
    expect(styleOf('bg-primary').backgroundColor).toBe('rgb(64, 112, 224)')
  })

  it('follows the device setting until the person chooses a theme', () => {
    harness.reactNative.__setDeviceScheme('dark')
    const provider = createNativeWindThemeProvider({
      themes: [lightTheme, darkTheme],
      defaultTheme: 'light',
      systemDefault: true,
    })
    expect(provider.getTheme().name).toBe('dark')
    expect(styleOf('bg-background').backgroundColor).toBe(paint(darkTheme.colors, 'background'))

    harness.reactNative.__setDeviceScheme('light')
    expect(provider.getTheme().name).toBe('light')
    expect(styleOf('bg-background').backgroundColor).toBe(paint(lightTheme.colors, 'background'))

    provider.setTheme('dark')
    harness.reactNative.__setDeviceScheme('light')
    expect(provider.getTheme().name).toBe('dark')
  })

  it('restores the saved theme from asynchronous storage and saves a new choice', async () => {
    const saved = new Map<string, string>([['molecule-theme', 'dark']])
    const storage = {
      get: async (key: string) => saved.get(key) ?? null,
      set: async (key: string, value: string) => void saved.set(key, value),
    }
    const provider = createNativeWindThemeProvider({
      themes: [lightTheme, darkTheme],
      defaultTheme: 'light',
      persistKey: 'molecule-theme',
      storage,
    })
    expect(provider.getTheme().name).toBe('light')
    await provider.ready
    expect(provider.getTheme().name).toBe('dark')
    expect(styleOf('bg-background').backgroundColor).toBe(paint(darkTheme.colors, 'background'))

    provider.toggleMode()
    await Promise.resolve()
    expect(saved.get('molecule-theme')).toBe('light')
  })

  it('reads the @molecule/app-storage provider bonded after it was created', async () => {
    const values = new Map<string, unknown>([['molecule-theme', 'dark']])
    const provider = createNativeWindThemeProvider({
      themes: [lightTheme, darkTheme],
      persistKey: 'molecule-theme',
    })
    // The bond file creates the theme provider before setupProviders() bonds storage.
    setStorageProvider({
      get: async (key: string) => values.get(key) ?? null,
      set: async (key: string, value: unknown) => void values.set(key, value),
      remove: async (key: string) => void values.delete(key),
      clear: async () => values.clear(),
      keys: async () => [...values.keys()],
    } as unknown as StorageProvider)
    await provider.ready
    expect(provider.getTheme().name).toBe('dark')
    provider.setTheme('light')
    await Promise.resolve()
    expect(values.get('molecule-theme')).toBe('light')
  })

  it('keeps the default theme when the saved one cannot be read', async () => {
    const provider = createNativeWindThemeProvider({
      themes: [lightTheme, darkTheme],
      persistKey: 'molecule-theme',
      storage: { get: () => Promise.reject(new Error('locked')), set: () => undefined },
    })
    await provider.ready
    expect(provider.getTheme().name).toBe('light')
  })
})

describe('createNativeWindThemeProvider on Expo web', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets the variables on <html> and toggles .dark', () => {
    const style = new Map<string, string>()
    const classes = new Set<string>()
    vi.stubGlobal('document', {
      documentElement: {
        style: { setProperty: (name: string, value: string) => style.set(name, value) },
        classList: {
          toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
        },
      },
    })
    const provider = createNativeWindThemeProvider({
      themes: [lightTheme, darkTheme],
      defaultTheme: 'light',
    })
    expect(style.get('--color-background')).toBe('rgb(246, 246, 246)')
    expect(style.get('--color-background-rgb')).toBe('246 246 246')
    expect(style.get('--color-overlay')).toBe('rgba(0, 0, 0, 0.5)')
    expect(classes.has('dark')).toBe(false)
    provider.toggleMode()
    expect(style.get('--color-background-rgb')).toBe('15 23 42')
    expect(classes.has('dark')).toBe(true)
  })
})
