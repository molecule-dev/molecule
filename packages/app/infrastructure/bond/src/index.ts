/**
 * Runtime provider wiring system for molecule.dev app-side packages.
 *
 * Enables swappable providers for state management, theming, routing, styling,
 * and any custom category — all through dynamic string-based keys. Most app
 * cores' own setup helpers (`setFont`, `setRouter`, `setClassMap`, each
 * `setProvider`) delegate INTO this registry, so `bond('theme', p)` and
 * `@molecule/app-theme`'s `setProvider(p)` write the same slot — use either.
 *
 * @example
 * ```typescript
 * import { bond, get, require as bondRequire, isBonded } from '@molecule/app-bond'
 * import { provider as routingProvider } from '@molecule/app-routing-react-router'
 * import type { StateProvider } from '@molecule/app-state'
 * import { provider as stateProvider } from '@molecule/app-state-zustand'
 * import type { ThemeProvider } from '@molecule/app-theme'
 * import { provider as themeProvider } from '@molecule/app-theme-css-variables'
 *
 * // Singleton providers (one per category)
 * bond('state', stateProvider)
 * bond('theme', themeProvider)
 *
 * // Named providers (multiple per category)
 * bond('routing', 'react', routingProvider)
 *
 * // Retrieve providers
 * const state = get<StateProvider>('state')          // undefined if not bonded
 * const theme = bondRequire<ThemeProvider>('theme')  // throws if not bonded
 * const router = get('routing', 'react')
 *
 * // Check before using
 * if (isBonded('routing', 'react')) {
 *   // ...
 * }
 * ```
 *
 * @remarks
 * - **Wire before ANY module evaluates a bond-backed accessor.** `get()`
 *   returns `undefined` and `require()` THROWS until a provider is bonded —
 *   and app modules are imported (module top-level runs) BEFORE your
 *   `setupProviders()`/`bonds/index.ts` executes. A module-scope
 *   `const cm = getClassMap()` or `const router = require('routing')` in a
 *   component file therefore runs pre-wiring and breaks the app at load.
 *   Call accessors inside components/functions, never at module top-level.
 * - **All cores now read this registry.** Every `@molecule/app-*` core routes
 *   its `setProvider()`/`getProvider()` through this bond registry (the ai-*,
 *   audio, color-picker, date-range-picker, gallery, image-crop,
 *   keyboard-shortcuts, markdown, stepper, timeline, tour, tree-view,
 *   battery, bluetooth, brightness, nfc, and screen-orientation cores were
 *   migrated off their old module-local singletons), so `bond('<category>', p)`
 *   and the core's own `setProvider()` write the same slot. Use either.
 * - **Re-bonding a category silently replaces the provider** (last bond wins).
 *   Call `configure({ strict: true })` to make double-bonding throw instead.
 *   `bond(type, null)` / `bond(type, undefined)` REMOVES the singleton for
 *   that category. `configure({ verbose: true })` logs each bond / unbond /
 *   clear / reset to `console.debug` (prefixed `[app-bond]`) for wiring-order
 *   tracing.
 * - `require` collides with CommonJS — import it renamed:
 *   `import { require as bondRequire } from '@molecule/app-bond'`.
 *
 * @module
 */

// Type exports
export * from './types.js'

// Registry exports
export * from './registry.js'

// Bond API exports
export * from './bond.js'
