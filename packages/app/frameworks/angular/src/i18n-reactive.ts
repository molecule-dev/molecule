/**
 * Signal-based reactive translation wrapper for Angular.
 *
 * Wraps `@molecule/app-i18n`'s `t()` function with an Angular signal so that
 * template bindings automatically re-evaluate when the locale changes. This
 * avoids NG0100 errors because the signal value is stable within a single
 * change detection cycle — it only changes between cycles.
 *
 * Components should import `t` from `@molecule/app-angular` instead of
 * `@molecule/app-i18n` to get automatic reactivity.
 *
 * @module
 */

import { signal } from '@angular/core'

import type { InterpolationValues } from '@molecule/app-i18n'
import { t as originalT } from '@molecule/app-i18n'

const localeVersion = signal(0)

/**
 * Bump the locale version signal, causing all template bindings that use
 * the reactive `t()` to re-evaluate on the next change detection cycle.
 *
 * Called automatically by the `ENVIRONMENT_INITIALIZER` in `provideMolecule`.
 */
export function bumpLocaleVersion(): void {
  localeVersion.update((v) => v + 1)
}

/**
 * Translate a key using the current locale.
 *
 * This is a signal-aware wrapper around `@molecule/app-i18n`'s `t()`.
 * Reading the internal locale signal establishes an Angular reactivity
 * dependency, so template bindings that call this function will be
 * re-evaluated when the locale changes.
 *
 * @param key - Translation key
 * @param values - Interpolation values
 * @param options - Options (defaultValue, count).
 * @param options.defaultValue - Fallback string when no translation is found.
 * @param options.count - Pluralization count.
 * @returns Translated string
 */
export const t = (
  key: string,
  values?: InterpolationValues,
  options?: { defaultValue?: string; count?: number },
): string => {
  localeVersion() // read signal to establish Angular reactivity tracking
  return originalT(key, values, options)
}
