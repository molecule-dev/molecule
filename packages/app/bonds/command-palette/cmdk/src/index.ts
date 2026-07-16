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
 * the built-in fuzzy matcher (exact substring scores highest, then
 * in-order character match) is used. The `defaultFuzzyMatch` config knob
 * currently has no effect. `close()` clears the query AND resets page
 * navigation to root; `pushPage(id)` silently ignores unregistered page ids.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
