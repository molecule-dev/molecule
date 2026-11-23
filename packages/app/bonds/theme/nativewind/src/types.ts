/**
 * Configuration types for the NativeWind theme provider.
 *
 * @module
 */

import type { Theme, ThemeProvider } from '@molecule/app-theme'

/**
 * Where a saved theme name is kept. Either call may be asynchronous: device
 * storage is. `@molecule/app-storage` satisfies it.
 */
export interface NativeWindThemeStorage {
  /** Reads the saved theme name (`null` when there is none). */
  get(key: string): Promise<unknown> | unknown
  /** Saves the chosen theme name. */
  set(key: string, value: string): Promise<void> | void
}

/**
 * Configuration for {@link createNativeWindThemeProvider}.
 */
export interface NativeWindThemeConfig {
  /** The themes the app offers. The first theme of each mode fills that mode until another is chosen. */
  themes: Theme[]
  /** The theme to start on (a name; default: the first theme). */
  defaultTheme?: string
  /**
   * With no saved choice, start on the theme whose mode matches the device's
   * appearance setting, and follow it when it changes, until the person picks a
   * theme. Default: false.
   */
  systemDefault?: boolean
  /** Saves the chosen theme under this key and restores it on the next launch. */
  persistKey?: string
  /**
   * Where `persistKey` is kept. Default: the `@molecule/app-storage` provider
   * bonded at startup (read once it is bonded, so the bond order does not matter).
   */
  storage?: NativeWindThemeStorage
}

/**
 * A `ThemeProvider` for NativeWind, with a promise that settles once a saved
 * theme has been read and applied.
 */
export interface NativeWindThemeProvider extends ThemeProvider {
  /** Settles once a saved theme (if any) has been restored: splash screens, tests. */
  ready: Promise<void>
}
