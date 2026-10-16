/**
 * Default app-side bond wirings (state + React + Tailwind + React Router +
 * localStorage + Arimo font + Molecule icons).
 *
 * Centralizes the byte-identical `app/src/bonds/<name>.ts` setup
 * functions that every flagship app shipped. Per-app bond files
 * become 1-line re-exports — `bonds/index.ts` import sites unchanged.
 *
 * `setupAppStylingTailwind` registers `tailwind-merge` as the class merger
 * for `cn()`; Tailwind itself is configured via env vars and the Vite plugin.
 * Apps wire it in `setupProviders()` alongside the others.
 *
 * @module
 */

import { setFont } from '@molecule/app-fonts'
import { font as arimoFont } from '@molecule/app-fonts-arimo'
import { setIconSet } from '@molecule/app-icons'
import { iconSet as moleculeIconSet } from '@molecule/app-icons-molecule'
import { setRouter } from '@molecule/app-routing'
import { provider as reactRouterProvider } from '@molecule/app-routing-react-router'
import {
  setProvider as setState,
  simpleProvider as defaultStateProvider,
} from '@molecule/app-state'
import { setProvider as setStorage } from '@molecule/app-storage'
import { provider as localStorageProvider } from '@molecule/app-storage-localstorage'
import { registerTailwindClassMerger } from '@molecule/app-styling-tailwind'
import { setProvider as setTheme } from '@molecule/app-theme'
import {
  createCSSVariablesThemeProvider,
  darkTheme,
  lightTheme,
} from '@molecule/app-theme-css-variables'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

/**
 * Pre-wired default CSS-variables theme provider with light + dark
 * themes from `@molecule/app-theme-css-variables`. Apps that need
 * custom themes should build their own provider and skip this.
 *
 * Lazily constructed on first access — `createCSSVariablesThemeProvider`
 * touches `globalThis.localStorage.getItem` during construction, which
 * throws in non-DOM environments (SSR, unit-test runners with
 * incomplete localStorage shims).
 */
let _defaultThemeProvider: ReturnType<typeof createCSSVariablesThemeProvider> | null = null
/** Returns (and lazily constructs) the shared default CSS-variables theme provider. */
export function getDefaultThemeProvider(): ReturnType<typeof createCSSVariablesThemeProvider> {
  if (!_defaultThemeProvider) {
    _defaultThemeProvider = createCSSVariablesThemeProvider({
      themes: [lightTheme, darkTheme],
      defaultTheme: 'light',
      persistKey: 'molecule-theme',
    })
  }
  return _defaultThemeProvider
}

/** Wires `@molecule/app-fonts-arimo` to `@molecule/app-fonts`. */
export function setupAppFontsArimo(): void {
  setFont(arimoFont)
}

/** Wires `@molecule/app-icons-molecule` to `@molecule/app-icons`. */
export function setupAppIconsMolecule(): void {
  setIconSet(moleculeIconSet)
}

/** Wires `@molecule/app-routing-react-router` to `@molecule/app-routing`. */
export function setupAppRoutingReactRouter(): void {
  setRouter(reactRouterProvider)
}

/**
 * Wires the framework-agnostic `simpleProvider` from `@molecule/app-state` as
 * the active state provider.
 *
 * WITHOUT this, `createStore()` throws
 * `@molecule/app-state: No provider set. Call setProvider() first` — nothing
 * else in a scaffolded app wires the `state` bond, so the documented
 * `createStore()` + `useStore()` pattern failed at the first render and every
 * page came up blank while `tsc` passed (X1 flash-m65).
 */
export function setupAppStateSimple(): void {
  setState(defaultStateProvider)
}

/** Wires `@molecule/app-storage-localstorage` to `@molecule/app-storage`. */
export function setupAppStorageLocalstorage(): void {
  setStorage(localStorageProvider)
}

/**
 * Wires `@molecule/app-styling-tailwind`: registers `tailwind-merge` as the
 * class merger for `@molecule/app-styling`'s `cn()`, so conflicting Tailwind
 * utilities resolve (last wins). Tailwind itself is configured via env vars +
 * the Vite plugin; this is the one runtime hook the framework-agnostic styling
 * core needs so it carries no Tailwind dependency of its own.
 */
export function setupAppStylingTailwind(): void {
  registerTailwindClassMerger()
}

/** Wires the default light + dark CSS-variables theme provider to `@molecule/app-theme`. */
export function setupAppThemeCssVariables(): void {
  setTheme(getDefaultThemeProvider())
}

/** Wires `@molecule/app-ui-tailwind` `classMap` to `@molecule/app-ui`. */
export function setupAppUiTailwind(): void {
  setClassMap(classMap)
}

/**
 * Wires all 8 universal app-side bonds in one call — state (the vanilla
 * `simpleProvider`, so `createStore()` works), fonts, routing, storage,
 * styling, theme, UI ClassMap, icons (in that order). Auth + i18n stay
 * per-app because they need app-specific config.
 *
 * Replaces the individual setupX() calls in per-app `bonds/index.ts`.
 */
export function setupAllDefaultBonds(): void {
  setupAppStateSimple()
  setupAppFontsArimo()
  setupAppRoutingReactRouter()
  setupAppStorageLocalstorage()
  setupAppStylingTailwind()
  setupAppThemeCssVariables()
  setupAppUiTailwind()
  setupAppIconsMolecule()
}
