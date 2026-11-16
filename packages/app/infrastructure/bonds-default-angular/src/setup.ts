/**
 * Default app-side bond wirings for Angular (Angular Router routing + the
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
import { provider as angularRouterProvider } from '@molecule/app-routing-angular-router'

/**
 * Wires `@molecule/app-routing-angular-router`'s `provider` to
 * `@molecule/app-routing`.
 *
 * The bond's `provider` constant is the core's browser router: the Angular
 * Router only exists inside a booted injector, so an import-time constant
 * cannot be Angular-backed. This is what a scaffold wires so molecule
 * packages always have A router (the same role the basic provider plays in
 * the React package); for the Angular-backed router pass
 * `provideMoleculeRouter(...)` next to Angular's own `provideRouter(routes)`
 * in `bootstrapApp`'s `providers`.
 */
export function setupAppRoutingAngularRouter(): void {
  setRouter(angularRouterProvider)
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
  setupAppRoutingAngularRouter()
  setupAppStorageLocalstorage()
  setupAppStylingTailwind()
  setupAppThemeCssVariables()
  setupAppUiTailwind()
  setupAppIconsMolecule()
  setupAppClipboardWeb()
}
