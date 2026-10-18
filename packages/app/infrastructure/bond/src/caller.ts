/**
 * Call-site detection for bond accessor errors.
 *
 * When `require()` cannot find a provider, the useful question is WHERE the
 * call happened. A call at a module's top level runs when that module is
 * imported — before `setupProviders()` has bonded anything — while a call from
 * inside a component means the category was simply never wired. Only the
 * stack separates those two cases, so this module reads it and names the first
 * frame that is NOT part of a `@molecule/*` package (the consumer's own code).
 *
 * @module
 */

/**
 * Stack frames that belong to the bond package itself — never the answer.
 * Matches both the monorepo source path and an installed/bundled copy.
 */
const SELF_FRAME =
  /[\\/]infrastructure[\\/]bond[\\/]|[\\/]@molecule[\\/]app-bond[\\/]|@molecule[_-]app-bond/

/**
 * Stack frames that belong to ANY `@molecule/*` package: an installed copy
 * (`node_modules/@molecule/…`), a Vite dependency bundle
 * (`@molecule_app-auth.js`), or this monorepo's source tree
 * (`<root>/packages/app/…`, `<root>/packages/api/…`).
 */
const MOLECULE_FRAME =
  /[\\/]node_modules[\\/]@molecule[\\/]|@molecule[_-](?:api|app)-|[\\/]packages[\\/](?:api|app)[\\/]/

/**
 * Trailing `path:line:column` of a V8 stack frame — with or without a
 * surrounding `(…)` and with or without the `file://` scheme.
 */
const FRAME_LOCATION = /((?:file:\/\/)?[^\s()]+):(\d+):(\d+)\)?$/

/**
 * Extracts `path:line:column` from every frame of a V8 stack string.
 *
 * @param stack - A stack string (typically `new Error().stack`).
 * @returns The frame locations in stack order (innermost first).
 */
const frameLocations = (stack: string): string[] => {
  const locations: string[] = []
  for (const rawLine of stack.split('\n')) {
    const line = rawLine.trim()
    if (!line.startsWith('at ')) continue
    const match = FRAME_LOCATION.exec(line)
    if (match) locations.push(`${match[1]}:${match[2]}:${match[3]}`)
  }
  return locations
}

/**
 * Normalizes a frame location into a module call site: drops the `file://`
 * scheme and Vite's `/@fs/` mount prefix so the path reads like the file the
 * developer actually opens.
 *
 * @param location - A `path:line:column` location from {@link frameLocations}.
 * @returns The normalized call site.
 */
const normalizeLocation = (location: string): string => {
  const normalized = location.startsWith('file://') ? location.slice('file://'.length) : location
  const fsMount = normalized.indexOf('/@fs/')
  if (fsMount !== -1) return normalized.slice(fsMount + 4)
  return normalized
}

/**
 * Finds the first stack frame that belongs to the application rather than to
 * an `@molecule/*` package (the bond package's own frames included), and
 * returns it as `path:line:column`.
 *
 * This is what lets a "no provider bonded" error say `Called from
 * /workspace/app/src/conduit/session.ts:85:20` instead of pointing the reader
 * back at the package that threw.
 *
 * @param stack - Stack to inspect. Defaults to the current call stack.
 * @returns The first non-`@molecule` call site, or `undefined` when every
 *   frame is package code (or the stack is unavailable).
 */
export const firstCallerOutsideMolecule = (
  stack: string | undefined = new Error().stack,
): string | undefined => {
  if (!stack) return undefined
  const caller = frameLocations(stack).find(
    (location) => !SELF_FRAME.test(location) && !MOLECULE_FRAME.test(location),
  )
  return caller === undefined ? undefined : normalizeLocation(caller)
}
