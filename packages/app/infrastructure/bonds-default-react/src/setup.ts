/**
 * Default app-side bond wirings for React (routing + the framework-neutral
 * defaults from `@molecule/app-bonds-default`: state + Tailwind ClassMap +
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

import {
  setupAppClipboardWeb,
  setupAppFontsArimo,
  setupAppIconsMolecule,
  setupAppStateSimple,
  setupAppStorageLocalstorage,
  setupAppStylingTailwind,
  setupAppThemeCssVariables,
  setupAppUiTailwind,
} from '@molecule/app-bonds-default'
import { setRouter } from '@molecule/app-routing'
import { provider as reactRouterProvider } from '@molecule/app-routing-react-router'

/** Wires `@molecule/app-routing-react-router` to `@molecule/app-routing`. */
export function setupAppRoutingReactRouter(): void {
  setRouter(reactRouterProvider)
}

/**
 * Wires all 9 universal app-side bonds in one call — state (the vanilla
 * `simpleProvider`, so `createStore()` works), fonts, routing, storage,
 * styling, theme, UI ClassMap, icons, clipboard (in that order). Auth + i18n stay
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
  setupAppClipboardWeb()
}
