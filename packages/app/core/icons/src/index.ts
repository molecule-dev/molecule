/**
 * Framework-agnostic icon set interfaces for molecule.dev.
 *
 * Icon set bond packages (e.g. `@molecule/app-icons-molecule`) export an
 * `IconSet` object which is bonded via {@link setIconSet} at application
 * startup. Application code retrieves icons via {@link getIcon} /
 * {@link getIconDataUrl}, both of which call {@link getIconSet} internally.
 *
 * @remarks
 * `getIconSet()` (and therefore `getIcon()` / `getIconDataUrl()`) throws a
 * package-specific error naming the actual fix — "call `setIconSet()` with
 * an `IconSet` (e.g. the export from `@molecule/app-icons-molecule`)" —
 * rather than the generic `@molecule/app-bond` "No 'icon-set' provider
 * bonded. Bond one first using bond('icon-set', provider)." message, which
 * does not tell a consumer which function or package to reach for.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
