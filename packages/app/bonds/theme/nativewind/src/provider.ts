/**
 * NativeWind theme provider.
 *
 * State, toggling and subscriptions are `@molecule/app-theme-css-variables`'
 * own (with `applyToDocument: false`), so a theme behaves the same on the web
 * and on a device. Only where the values go differs: on a device they become
 * NativeWind's root CSS variables, which every mounted component reads; on Expo
 * web they are set on `<html>`, where NativeWind's CSS reads them.
 *
 * @module
 */

import { colorScheme, StyleSheet } from 'nativewind'
import { Appearance } from 'react-native'

import {
  getProvider as getStorageProvider,
  hasProvider as hasStorageProvider,
} from '@molecule/app-storage'
import type { Theme } from '@molecule/app-theme'
import { createCSSVariablesThemeProvider } from '@molecule/app-theme-css-variables'
import { themeVariables } from '@molecule/app-ui-tailwind'

import type {
  NativeWindThemeConfig,
  NativeWindThemeProvider,
  NativeWindThemeStorage,
} from './types.js'

/** The part of NativeWind's root-variable registration this provider uses. */
type RootVariables = Record<string, { light: string; dark: string }>

/**
 * The document on Expo web; `undefined` on a device.
 *
 * @returns The document, when there is one.
 */
function webDocument(): Document | undefined {
  return typeof document === 'undefined' ? undefined : document
}

/**
 * Writes a theme's variables where the running platform's styles read them.
 *
 * @param theme - The active theme.
 * @param themes - Every registered theme (each mode's first theme fills that mode's slot).
 * @param followSystem - Whether the device's appearance setting picks the mode.
 */
function applyTheme(theme: Theme, themes: Theme[], followSystem: boolean): void {
  const doc = webDocument()
  if (doc) {
    // Expo web: NativeWind compiles to plain CSS; its variables live on <html>.
    const style = doc.documentElement.style
    for (const [name, value] of Object.entries(themeVariables(theme.colors))) {
      style.setProperty(name, value)
    }
    doc.documentElement.classList.toggle('dark', theme.mode === 'dark')
    return
  }
  // The active theme owns its mode's slot; the other mode keeps its first theme.
  const slots: Record<'light' | 'dark', Theme> = {
    light: themes.find((t) => t.mode === 'light') ?? theme,
    dark: themes.find((t) => t.mode === 'dark') ?? theme,
  }
  slots[theme.mode] = theme
  const light = themeVariables(slots.light.colors)
  const dark = themeVariables(slots.dark.colors)
  const rootVariables: RootVariables = {}
  for (const name of Object.keys(light))
    rootVariables[name] = { light: light[name], dark: dark[name] }
  // The call NativeWind's own compiled stylesheet makes: it updates the values every
  // mounted component reads, so the screen repaints with no wrapper component.
  StyleSheet.registerCompiled({ rootVariables } as Parameters<
    typeof StyleSheet.registerCompiled
  >[0])
  colorScheme.set(followSystem ? 'system' : theme.mode)
}

/**
 * The storage a saved theme is read from: the configured one, else the
 * `@molecule/app-storage` provider once it is bonded.
 *
 * @param configured - The `storage` option.
 * @returns The storage, or `undefined` when none is available.
 */
function storageFor(
  configured: NativeWindThemeStorage | undefined,
): NativeWindThemeStorage | undefined {
  if (configured) return configured
  if (!hasStorageProvider()) return undefined
  const provider = getStorageProvider()
  return {
    get: (key) => provider.get<string>(key),
    set: (key, value) => provider.set(key, value),
  }
}

/**
 * Creates a theme provider for a NativeWind app (iOS, Android and Expo web).
 *
 * Pair it with `@molecule/app-ui-nativewind`'s Tailwind preset, which gives every
 * colour class of the web ClassMap a variable this provider sets.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-theme'
 * import { createNativeWindThemeProvider, darkTheme, lightTheme } from '@molecule/app-theme-nativewind'
 *
 * export const themeProvider = createNativeWindThemeProvider({
 *   themes: [lightTheme, darkTheme],
 *   defaultTheme: 'light',
 *   systemDefault: true,
 *   persistKey: 'molecule-theme',
 * })
 * setProvider(themeProvider)
 * ```
 * @param config - The themes, the starting theme, OS-following and persistence.
 * @returns The provider.
 */
export function createNativeWindThemeProvider(
  config: NativeWindThemeConfig,
): NativeWindThemeProvider {
  const { themes, defaultTheme, persistKey, systemDefault = false } = config
  const base = createCSSVariablesThemeProvider({ themes, defaultTheme, applyToDocument: false })
  let followSystem = systemDefault

  const systemTheme = (): Theme | undefined => {
    const mode = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
    return themes.find((t) => t.mode === mode)
  }
  const startOnSystem = followSystem ? systemTheme() : undefined
  if (startOnSystem) base.setTheme(startOnSystem)
  applyTheme(base.getTheme(), themes, followSystem)
  base.subscribe((theme) => applyTheme(theme, themes, followSystem))

  // The appearance setting changed and the person has not chosen: follow it.
  Appearance.addChangeListener(() => {
    const next = followSystem ? systemTheme() : undefined
    if (next && next !== base.getTheme()) base.setTheme(next)
  })

  // Device storage is asynchronous, and the bond file runs before setupProviders()
  // bonds storage: read after the current startup work, starting on the default.
  const ready: Promise<void> = persistKey
    ? new Promise<void>((resolve) => setTimeout(resolve, 0)).then(async () => {
        const storage = storageFor(config.storage)
        if (!storage) return
        let saved: unknown
        try {
          saved = await storage.get(persistKey)
        } catch (_error) {
          // An unreadable saved choice leaves the default theme, which is what a
          // first launch shows; the next choice is saved again.
          return
        }
        if (typeof saved === 'string' && themes.some((t) => t.name === saved)) {
          followSystem = false
          base.setTheme(saved)
        }
      })
    : Promise.resolve()

  /**
   * Applies a person's choice: it stops OS-following and is saved.
   *
   * @param change - The change to the base provider.
   */
  const choose = (change: () => void): void => {
    followSystem = false
    change()
    if (!persistKey) return
    const storage = storageFor(config.storage)
    if (!storage) return
    Promise.resolve(storage.set(persistKey, base.getTheme().name)).catch((_error: unknown) => {
      // The choice is applied; only remembering it failed, and the next choice
      // tries again. Nothing on screen depends on it.
    })
  }

  return {
    getTheme: () => base.getTheme(),
    setTheme: (theme) => choose(() => base.setTheme(theme)),
    toggleMode: () => choose(() => base.toggleMode()),
    subscribe: (callback) => base.subscribe(callback),
    getThemes: () => themes,
    getServerTheme: () => base.getServerTheme?.() ?? base.getTheme(),
    ready,
  }
}
