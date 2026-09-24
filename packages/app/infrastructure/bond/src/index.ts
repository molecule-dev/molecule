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
 * import { bond, configure, get, getAll, isBonded, require as bondRequire } from '@molecule/app-bond'
 * import type { StateProvider } from '@molecule/app-state'
 * import { provider as zustandProvider } from '@molecule/app-state-zustand'
 *
 * // Startup (e.g. src/bonds/index.ts), BEFORE rendering. Strict mode throws on a double bond.
 * configure({ strict: true })
 * bond('state', zustandProvider)
 *
 * // Later, inside a function/component: read the singleton back (throws if never bonded).
 * const state = bondRequire<StateProvider>('state')
 * const cart = state.createStore({ initialState: { items: 0 } })
 * cart.setState({ items: 2 })
 * const items = cart.getState().items // 2
 *
 * // Named providers: several implementations of one custom category.
 * interface Exporter {
 *   extension: string
 *   serialize(rows: string[][]): string
 * }
 * const csv: Exporter = { extension: 'csv', serialize: (rows) => rows.map((r) => r.join(',')).join('\n') }
 * const tsv: Exporter = { extension: 'tsv', serialize: (rows) => rows.map((r) => r.join('\t')).join('\n') }
 * bond('exporter', 'csv', csv)
 * bond('exporter', 'tsv', tsv)
 *
 * const text = get<Exporter>('exporter', 'csv')?.serialize([['id', 'name'], ['1', 'Ada']]) // 'id,name\n1,Ada'
 * const hasTsv = isBonded('exporter', 'tsv') // true
 * const exporterCount = getAll<Exporter>('exporter').size // 2
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
 * - **Singleton and named slots are separate.** `bond('exporter', 'csv', p)` does NOT make
 *   `get('exporter')` return `p` — read named providers with `get(type, name)` / `getAll(type)`.
 *   `get()` returns `undefined` when nothing is bonded; `require()` throws.
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
