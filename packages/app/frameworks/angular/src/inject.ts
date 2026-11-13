/**
 * Shared injection helpers for the React-parity hook functions.
 *
 * @module
 */

import { inject, type InjectionToken } from '@angular/core'

import { t } from '@molecule/app-i18n'

/**
 * Reads a service token registered by `provideMolecule` (or a `provide*`
 * helper), throwing React's provider-missing error when it is absent.
 *
 * Angular's own missing-token failure is a `NullInjectorError`; React's hooks
 * throw a plain `Error` whose message goes through i18n, so this reproduces
 * React's contract under this package's error-key namespace
 * (`react.error.useAuthOutsideProvider` becomes
 * `angular.error.useAuthOutsideProvider`).
 *
 * @param token - The injection token (`AUTH_CLIENT`, `THEME_PROVIDER`, …).
 * @param key - The error key's suffix after `angular.error.` (React's suffix).
 * @param defaultValue - React's English error text.
 * @returns The service.
 * @throws {Error} When no provider registered the token.
 */
export function injectProvider<T>(token: InjectionToken<T>, key: string, defaultValue: string): T {
  const provider = inject(token, { optional: true })
  if (!provider) {
    throw new Error(
      t(`angular.error.${key}`, undefined, {
        defaultValue,
      }),
    )
  }
  return provider
}
