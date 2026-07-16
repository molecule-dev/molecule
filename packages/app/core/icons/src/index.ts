/**
 * Framework-agnostic icon set interfaces for molecule.dev.
 *
 * Icon set bond packages (e.g. `@molecule/app-icons-molecule`) export an
 * `IconSet` object which is bonded via {@link setIconSet} at application
 * startup. Application code retrieves icons via {@link getIcon} /
 * {@link getIconDataUrl}, both of which call {@link getIconSet} internally.
 *
 * @example
 * ```typescript
 * import { setIconSet, getIconDataUrl } from '@molecule/app-icons'
 * import { iconSet } from '@molecule/app-icons-molecule'
 *
 * setIconSet(iconSet)   // once, at app startup — before anything renders an icon
 *
 * // In components, prefer your framework UI's Icon component
 * // (e.g. <Icon name="check-circle" /> from the app's UI bundle), which reads
 * // the bonded set. For CSS/background/favicon contexts:
 * const url = getIconDataUrl('check-circle', '#16a34a')
 * ```
 *
 * @remarks
 * - **Bond the icon set before first render** — `getIcon()`/`getIconDataUrl()` (and
 *   any `Icon` component built on them) throw until `setIconSet()` has run; wire it
 *   in the app's bond setup, not lazily inside a component.
 * - Icon names are kebab-case (`'arrow-right'`, `'x-mark'`) and type-checked against
 *   `IconName`. Don't invent names: an unknown name is a runtime error, not a blank.
 *   App-specific glyphs are added by merging `IconData` into the bonded set and
 *   augmenting `CustomIconNames` (see that interface) — never by inlining raw SVG
 *   per call site.
 * - Icons are decorative by default — pair them with accessible text
 *   (`t('key', values, { defaultValue })` labels or `aria-label`), never as the only
 *   carrier of meaning.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
