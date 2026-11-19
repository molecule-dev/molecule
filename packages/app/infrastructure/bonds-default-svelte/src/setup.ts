/**
 * Default app-side bond wirings for Svelte (SvelteKit routing + the
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
import { provider as svelteKitRouterProvider } from '@molecule/app-routing-sveltekit'

/**
 * Wires `@molecule/app-routing-sveltekit`'s `provider` to
 * `@molecule/app-routing`.
 *
 * The bond's `provider` constant is the core's browser-history router:
 * SvelteKit's client router is reachable only inside a SvelteKit app (through
 * the `$app/*` modules, which a package cannot import), so no kit-backed
 * router can be built at import time. This is what a scaffold wires so
 * molecule packages always have A router (the same role the basic provider
 * plays in the React package); for the kit-backed adapter build it in the root
 * layout — `createSvelteKitRouter(createSvelteKitNavigation({ goto, page, afterNavigate, rootHref: resolve('/') }))`,
 * with `goto` and `afterNavigate` from `$app/navigation`, `page` from `$app/state` and
 * `resolve` from `$app/paths` — and hand it to `@molecule/app-svelte`'s
 * `setMoleculeContext({ router })`.
 */
export function setupAppRoutingSvelteKit(): void {
  setRouter(svelteKitRouterProvider)
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
  setupAppRoutingSvelteKit()
  setupAppStorageLocalstorage()
  setupAppStylingTailwind()
  setupAppThemeCssVariables()
  setupAppUiTailwind()
  setupAppIconsMolecule()
  setupAppClipboardWeb()
}
