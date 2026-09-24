/**
 * Command palette core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for Cmd+K / Ctrl+K command palettes
 * with hierarchical groups, nested pages, and fuzzy search. Bond a provider
 * (e.g. `@molecule/app-command-palette-cmdk`) at startup, then use
 * {@link createPalette} anywhere.
 *
 * @example
 * ```typescript
 * import { createPalette, setProvider } from '@molecule/app-command-palette'
 * import { provider } from '@molecule/app-command-palette-cmdk'
 *
 * setProvider(provider) // at startup
 *
 * const visited: string[] = []
 * const navigate = (path: string): void => {
 *   visited.push(path) // your router's navigate()
 * }
 *
 * // Labels are shown as-is — pass them through t() before building the options.
 * const palette = createPalette({
 *   groups: [
 *     {
 *       id: 'navigation',
 *       label: 'Navigation',
 *       commands: [
 *         { id: 'home', label: 'Go Home', onSelect: () => navigate('/') },
 *         {
 *           id: 'settings',
 *           label: 'Settings',
 *           keywords: ['preferences'],
 *           onSelect: () => navigate('/settings'),
 *         },
 *       ],
 *     },
 *   ],
 *   placeholder: 'Type a command…',
 * })
 *
 * palette.open() // from YOUR Cmd+K / Ctrl+K handler — the palette binds no keys
 * palette.setQuery('prefs') // from the input's onChange; then re-read the results
 * const [first] = palette.getFilteredGroups()[0]?.commands ?? []
 * const page = first?.onSelect() // Enter: run the highlighted command
 * if (typeof page === 'string') palette.pushPage(page) // a returned string = open that sub-page
 * else palette.close()
 * console.log(visited) // ['/settings']
 * ```
 *
 * @remarks
 * - **The instance is headless — no dialog renders and no key is bound by the
 *   provider.** Your app owns the UI: render an overlay + input + results list from
 *   `isOpen()` / `getFilteredGroups()` (re-read after each `setQuery()` call), style
 *   it via `getClassMap()`/`cm.*`, and localize every label through
 *   `t('key', values, { defaultValue })`.
 * - **Bind the open shortcut yourself** (e.g. register Cmd+K / Ctrl+K through the
 *   app's keyboard-shortcuts layer and call `palette.open()`); wire Escape to
 *   `palette.close()`. **There is no `selectCommand()` / `execute()` on the
 *   instance** — Enter/click calls the highlighted item's own `onSelect()` (taken
 *   from `getFilteredGroups()`).
 * - Pass command/group `label`s through i18n BEFORE building the options — the
 *   palette never translates for you.
 * - An `onSelect` returning a string is a palette page id (from `options.pages`):
 *   when YOU call `onSelect()`, pass that string to `pushPage()` yourself (the
 *   instance does not see the return value). Return nothing for plain actions,
 *   then `close()`. `close()` also resets the query and page stack.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The palette opens with the keyboard shortcut (Cmd+K / Ctrl+K) and via any
 *   visible trigger, and closes with Escape.
 * - [ ] Commands render in their groups, and typing fuzzy-filters them down to
 *   matches.
 * - [ ] Selecting a navigation command actually navigates (the URL/screen
 *   changes) — not just closes the palette.
 * - [ ] Executing an action command performs the real action with a visible
 *   effect.
 * - [ ] The whole flow works keyboard-only: arrow keys move the highlight, Enter
 *   executes the highlighted command.
 * - [ ] A query with no matches shows an empty state, not a stale or broken list.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
