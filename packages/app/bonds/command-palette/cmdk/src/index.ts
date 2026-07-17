/**
 * cmdk-style command palette provider for molecule.dev.
 *
 * Implements `CommandPaletteProvider` from `@molecule/app-command-palette`
 * as a HEADLESS in-memory state manager modeled on cmdk's API shape — it
 * does NOT depend on or load the cmdk library; your app renders the
 * overlay/input/list and binds the keyboard shortcut.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-command-palette-cmdk'
 * import { setProvider } from '@molecule/app-command-palette'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * Filtering: a custom `options.filter` always takes precedence; otherwise
 * the built-in matcher is used (exact substring scores highest, then, when
 * `defaultFuzzyMatch` is `true`, an in-order subsequence match). Set the
 * provider config `defaultFuzzyMatch: false` to restrict the built-in
 * matcher to exact substring matches only. `close()` clears the query AND
 * resets page navigation to root; `pushPage(id)` silently ignores
 * unregistered page ids.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
