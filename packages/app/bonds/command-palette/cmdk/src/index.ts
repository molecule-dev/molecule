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
 * import { createPalette, setProvider } from '@molecule/app-command-palette'
 * import { createCmdkProvider } from '@molecule/app-command-palette-cmdk'
 *
 * // Startup: bond once (no cmdk install needed — this is headless state).
 * setProvider(createCmdkProvider({ defaultFuzzyMatch: true }))
 *
 * // Anywhere: create the palette through the core.
 * const palette = createPalette({
 *   groups: [
 *     {
 *       id: 'navigation',
 *       label: 'Navigation', // user-visible: translate with your app's own t() keys
 *       commands: [
 *         {
 *           id: 'open-settings',
 *           label: 'Open settings',
 *           keywords: ['preferences'],
 *           shortcut: 'mod+,',
 *           onSelect: () => console.log('navigate to /settings'),
 *         },
 *       ],
 *     },
 *   ],
 * })
 *
 * palette.open() // bind Cmd/Ctrl+K to this yourself
 * palette.setQuery('pref') // from your input's onInput
 * const [group] = palette.getFilteredGroups() // render these; matched via `keywords`
 * group?.commands[0]?.onSelect() // Enter on the highlighted item
 * palette.close()
 * ```
 *
 * @remarks
 * The factory is `createCmdkProvider(config)` — there is NO `createProvider` export. Wire it
 * with `setProvider(...)` from `@molecule/app-command-palette` before the first core
 * `createPalette(...)`. Nothing is rendered and no keyboard shortcut is bound — your UI does
 * both. The public instance has no `execute()`: run `command.onSelect()` yourself, and if it
 * returns a page id, call `palette.pushPage(thatId)` (the core does not do it for you).
 * `disabled` commands are still returned by `getFilteredGroups()` — skip them in your UI.
 *
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
