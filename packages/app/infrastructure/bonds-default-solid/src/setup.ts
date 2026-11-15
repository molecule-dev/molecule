/**
 * Default app-side bond wirings for Solid (Solid Router routing + the
 * framework-neutral defaults from `@molecule/app-bonds-default`: state +
 * Tailwind ClassMap + localStorage + Arimo font + Molecule icons).
 *
 * Centralizes the byte-identical `app/src/bonds/<name>.ts` setup
 * functions that every flagship app shipped. Per-app bond files
 * become 1-line re-exports — `bonds/index.ts` import sites unchanged.
 *
 * @module
 */

import {
  setupAppFontsArimo,
  setupAppIconsMolecule,
  setupAppStateSimple,
  setupAppStorageLocalstorage,
  setupAppStylingTailwind,
  setupAppThemeCssVariables,
  setupAppUiTailwind,
} from '@molecule/app-bonds-default'
import { setRouter } from '@molecule/app-routing'
import { provider as solidRouterProvider } from '@molecule/app-routing-solid-router'

/**
 * Wires `@molecule/app-routing-solid-router`'s `provider` to
 * `@molecule/app-routing`.
 *
 * The bond's `provider` constant is the core's browser router: a Solid Router
 * needs a component context (`useLocation` and friends read it), so no
 * Solid-backed router can be built at import time. This is what a scaffold
 * wires so molecule packages always have A router (the same role the basic
 * provider plays in the React package); for the native Solid Router adapter
 * call `createSolidRouter()` from a component under the router (typically its
 * `root` component) and bond that instead.
 */
export function setupAppRoutingSolidRouter(): void {
  setRouter(solidRouterProvider)
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
  setupAppRoutingSolidRouter()
  setupAppStorageLocalstorage()
  setupAppStylingTailwind()
  setupAppThemeCssVariables()
  setupAppUiTailwind()
  setupAppIconsMolecule()
}
