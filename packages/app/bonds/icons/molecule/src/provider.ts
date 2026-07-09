/**
 * Molecule default icons provider for molecule.dev.
 *
 * @module
 */

import type { IconData, IconSet } from '@molecule/app-icons'

import * as allIcons from './icons/index.js'

/**
 * Converts a camelCase string to kebab-case (e.g. `'arrowRight'` → `'arrow-right'`).
 * @param str - The camelCase string to convert.
 * @returns The kebab-case string.
 */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

/**
 * Molecule default icon set — all icons keyed by kebab-case name.
 *
 * Built from individual icon modules in `./icons/`.
 */
export const icons: IconSet = Object.fromEntries(
  Object.entries(allIcons)
    .filter(
      (entry): entry is [string, IconData] =>
        typeof entry[1] === 'object' && entry[1] !== null && 'paths' in entry[1],
    )
    .map(([key, value]) => [camelToKebab(key), value]),
)

/**
 * Molecule default icon set provider. Wire at app startup:
 * ```typescript
 * import { setIconSet } from '@molecule/app-icons'
 * import { iconSet } from '@molecule/app-icons-molecule'
 * setIconSet(iconSet)
 * ```
 */
export const iconSet: IconSet = icons

// This set ships these glyphs beyond the required ComponentIconName contract.
// Registering them in CustomIconNames lets `getIcon()` / `<Icon name="…" />`
// accept them type-safely (see @molecule/app-icons `IconName`).
declare module '@molecule/app-icons' {
  interface CustomIconNames {
    browser: true
    chat: true
    'device-desktop': true
    'device-mobile': true
    'device-tablet': true
    hash: true
    rotate: true
    sparkle: true
    'star-outline': true
  }
}
