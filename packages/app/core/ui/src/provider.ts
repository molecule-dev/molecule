/**
 * UI bond accessor and class-map resolution.
 *
 * Bond packages (e.g. `@molecule/app-ui-tailwind`) call `setProvider()`
 * and `setClassMap()` during setup. Application code uses `getClassMap()`
 * to resolve styling-agnostic CSS class names from the bonded styling
 * library (Tailwind, Bootstrap, etc.).
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type { UIClassMap } from './types.js'

/**
 * Identifies the bonded UI styling library. Providers set `name`
 * to indicate which library is active (e.g. `"tailwind"`, `"bootstrap"`).
 */
export interface UIProvider {
  /**
   * Identifier for the styling library (e.g. `"tailwind"`, `"ionic"`).
   */
  name: string
}

const BOND_TYPE = 'ui'
const BOND_TYPE_CLASSMAP = 'ui-classmap'

/**
 * Registers a UI provider as the active singleton.
 *
 * @param provider - The UI provider implementation to bond.
 */
export function setProvider(provider: UIProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded UI provider, or `undefined` if none is configured.
 *
 * @returns The bonded UI provider, or `undefined`.
 */
export function getProvider(): UIProvider | undefined {
  return bondGet<UIProvider>(BOND_TYPE)
}

/**
 * Checks whether a UI provider is currently bonded.
 *
 * @returns `true` if a UI provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

// ============================================================================
// CLASS MAP — STYLING-AGNOSTIC CLASS RESOLUTION
// ============================================================================

/**
 * Registers a UIClassMap as the active styling resolver. Called at
 * app startup to wire a styling library (e.g. Tailwind, Bootstrap).
 *
 * @param classMap - The UIClassMap implementation to bond.
 *
 * @example
 * ```typescript
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 * setClassMap(classMap)
 * ```
 */
export function setClassMap(classMap: UIClassMap): void {
  bond(BOND_TYPE_CLASSMAP, classMap)
}

/**
 * Retrieves the bonded UIClassMap, throwing if none is configured.
 * Use this to resolve styling-agnostic class names in components.
 *
 * @returns The bonded UIClassMap implementation.
 * @throws {Error} If no UIClassMap has been bonded via `setClassMap()`.
 */
export function getClassMap(): UIClassMap {
  const classMap = bondGet<UIClassMap>(BOND_TYPE_CLASSMAP)
  if (!classMap) {
    throw new Error(
      t('ui.error.noClassMap', undefined, {
        defaultValue:
          'No UIClassMap has been set. Call setClassMap() at app startup with a styling library implementation (e.g., @molecule/app-ui-tailwind).',
      }),
    )
  }
  return classMap
}

/**
 * Checks whether a UIClassMap is currently bonded.
 *
 * @returns `true` if a UIClassMap is bonded.
 */
export function hasClassMap(): boolean {
  return isBonded(BOND_TYPE_CLASSMAP)
}
