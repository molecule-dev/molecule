/**
 * Default app-side bond wirings for Vue (Vue Router routing + the
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
import { provider as vueRouterProvider } from '@molecule/app-routing-vue-router'

/**
 * Wires `@molecule/app-routing-vue-router`'s `provider` to
 * `@molecule/app-routing`.
 *
 * The bond's `provider` constant is its default router: with no Vue Router
 * instance it is the core's browser router (this is what a scaffold wires
 * before the app root exists, the same role the basic provider plays in the
 * React package). For the real Vue Router-backed adapter call
 * `useMoleculeRouterProvider()` once near the app root (it builds the adapter
 * from `useRouter()` and bonds it), or `createVueRouter({ router: useRouter() })`
 * + `setRouter()` by hand — molecule packages then navigate through Vue
 * Router's own history.
 */
export function setupAppRoutingVueRouter(): void {
  setRouter(vueRouterProvider)
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
  setupAppRoutingVueRouter()
  setupAppStorageLocalstorage()
  setupAppStylingTailwind()
  setupAppThemeCssVariables()
  setupAppUiTailwind()
  setupAppIconsMolecule()
  setupAppClipboardWeb()
}
