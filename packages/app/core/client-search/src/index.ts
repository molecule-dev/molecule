/**
 * Client-side search core interface for molecule.dev.
 *
 * Index a list the app already holds in memory — a package catalog, a settings
 * page, a table — and search it as the person types: prefix matching, typo
 * tolerance, per-field boosts, and one query grammar every bond understands
 * (`category:auth -deprecated "sign in"`). Bond a provider (e.g.
 * `@molecule/app-client-search-minisearch`) at startup, then call
 * {@link createIndex} anywhere.
 *
 * @example
 * ```typescript
 * import { createIndex, setProvider } from '@molecule/app-client-search'
 * import { provider } from '@molecule/app-client-search-minisearch'
 *
 * setProvider(provider)
 *
 * const index = createIndex(packages, {
 *   idField: 'name',
 *   fields: ['name', 'description', 'exports'],
 *   filterFields: ['category', 'type', 'stack'],
 *   boost: { name: 3 },
 * })
 *
 * index.search('category:auth oauth')       // auth packages mentioning OAuth, best first
 * index.search('"sign in" -deprecated')      // the phrase, minus anything deprecated
 * index.search({ text: '', filters: [{ field: 'type', values: ['bond'] }] }) // browse mode
 * ```
 *
 * @remarks
 * - **This searches memory, not a server.** Hand it the list you already
 *   rendered (a few thousand records is fine); for search over a database or
 *   millions of rows use `@molecule/api-search` on the API side.
 * - **Filter fields are opt-in.** `field:value` only becomes a filter when
 *   `field` is in `filterFields` (or in `fields` when `filterFields` is unset);
 *   anything else stays ordinary text, so a query like `re:act` still searches.
 *   List the fields you want filterable, and keep the names short: they are
 *   what people type.
 * - **Filters compare whole values, not substrings.** `category:auth` matches
 *   a `category` of `auth` or an array containing `auth`, case-insensitively;
 *   use `category:auth*` for a prefix. Free text is what matches inside
 *   descriptions.
 * - **Empty text is browse mode.** With filters it lists every document they
 *   accept in insertion order (score `0`); with nothing at all it lists every
 *   document. Use that for "show the category" instead of a second code path.
 * - The index is plain data with methods — build it once per list
 *   (`useMemo` on the docs), not on every keystroke, and `replace`/`remove`
 *   documents in place when the list changes.
 * - This core renders nothing and binds no key. A results list, highlighting
 *   and a `/` shortcut belong to the app (see `@molecule/app-client-search-react`
 *   and `@molecule/app-keyboard-shortcuts`), styled via `getClassMap()` and
 *   translated with `t()`.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Typing in the search box narrows the list on every keystroke, and
 *   the best match is first (a name match beats a description match).
 * - [ ] A typo (`paymnts`) still finds the right records.
 * - [ ] `field:value` narrows to that value, and combining it with text
 *   narrows further; an unknown `word:thing` searches as plain text.
 * - [ ] A quoted phrase only matches records containing it verbatim, and a
 *   `-term` removes records containing that term.
 * - [ ] Clearing the box restores the full list, with no stale results.
 *
 * @module
 */

export * from './provider.js'
export * from './query.js'
export * from './types.js'
