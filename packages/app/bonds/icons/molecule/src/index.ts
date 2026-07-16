/**
 * Molecule default icon set for molecule.dev — the fleet's built-in SVG
 * glyphs bundled as an `IconSet` keyed by kebab-case name.
 *
 * @example
 * ```typescript
 * import { setIconSet } from '@molecule/app-icons'
 * import { iconSet } from '@molecule/app-icons-molecule'
 *
 * setIconSet(iconSet)   // once, at app startup — before anything renders an icon
 * ```
 *
 * @remarks
 * - **Icon names are kebab-case** (`'arrow-right'`, `'check-circle'`). The
 *   exported constants are camelCase (`arrowRight`) but registration converts
 *   the keys — `<Icon name="arrowRight" />` is a runtime error, not a blank.
 * - Beyond the required `ComponentIconName` contract this set ships extra
 *   glyphs (`browser`, `chat`, `device-desktop|mobile|tablet`, `hash`,
 *   `rotate`, `sparkle`, `star-outline`), registered type-safely via the
 *   `CustomIconNames` augmentation.
 * - In components prefer the framework UI's `<Icon name="…" />` (reads the
 *   bonded set); use `getIconDataUrl(name, color)` for CSS/background/favicon
 *   contexts.
 *
 * @module
 */

export * from './icons/index.js'
export * from './provider.js'
