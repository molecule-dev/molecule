/**
 * SvelteKit provider for the molecule `Router` (`@molecule/app-routing`).
 *
 * SvelteKit's client router is reachable only inside a SvelteKit app, through the
 * virtual modules `$app/navigation` and `$app/stores`, which a package cannot import.
 * So the app passes those functions in — a {@link SvelteKitNavigation} — and this bond
 * never imports `$app/*`. Build the router ONCE in the root layout and hand it to
 * `@molecule/app-svelte`'s `setMoleculeContext({ router })`; molecule packages then
 * navigate, read params/query and guard through the framework-neutral `Router` while
 * every navigation runs through SvelteKit (kit links, `goto`, and the back button all
 * notify the same subscribers).
 *
 * @example
 * ```svelte
 * <!-- src/routes/+layout.svelte -->
 * <script lang="ts">
 *   import { afterNavigate, goto, replaceState } from '$app/navigation'
 *   import { page } from '$app/stores'
 *   import { createSvelteKitNavigation, createSvelteKitRouter } from '@molecule/app-routing-sveltekit'
 *   import { setMoleculeContext } from '@molecule/app-svelte'
 *
 *   // `afterNavigate` must be called during component initialisation, so build the
 *   // navigation here, in the root layout, once.
 *   const router = createSvelteKitRouter(createSvelteKitNavigation({ goto, replaceState, page, afterNavigate }))
 *
 *   setMoleculeContext({ router })
 * </script>
 * ```
 *
 * @remarks
 * - **Read the location through the router, not `$page`.** Molecule packages see
 *   `getLocation()`/`subscribe()`; kit's `page` store stays the bond's input.
 * - **The exported `provider` constant is NOT for SvelteKit apps** — it is the core
 *   browser-history router, for molecule code outside SvelteKit. Wiring it in a SvelteKit
 *   app moves history behind kit's back.
 * - Navigation state is `page.state`, so it must be an object; kit's own `sveltekit:*`
 *   history keys are stripped from `getLocation().state`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
