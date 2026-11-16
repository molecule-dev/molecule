/**
 * Shared injection helpers for the React-parity hook functions.
 *
 * @module
 */

import { inject, type InjectionToken } from '@angular/core'

import { t } from '@molecule/app-i18n'

/**
 * The provider-missing error keys this package throws, one per hook that needs
 * an injection token (the React hook's error-key suffix; the full key is
 * `angular.error.<key>`).
 */
export type ProviderErrorKey =
  | 'useAuthOutsideProvider'
  | 'useEditorOutsideProvider'
  | 'useHttpOutsideProvider'
  | 'useLoggerOutsideProvider'
  | 'usePreviewOutsideProvider'
  | 'useRouterOutsideProvider'
  | 'useStorageOutsideProvider'
  | 'useThemeOutsideProvider'
  | 'useWorkspaceOutsideProvider'

/**
 * The localized provider-missing error text for one hook.
 *
 * Each key is one literal `t()` call with a literal key, so the locale bond's
 * parity check can see every key and every non-English locale resolves it.
 *
 * @param key - The error key's suffix after `angular.error.` (React's suffix).
 * @returns The localized error message.
 */
const providerErrorMessage = (key: ProviderErrorKey): string => {
  switch (key) {
    case 'useAuthOutsideProvider':
      return t('angular.error.useAuthOutsideProvider', undefined, {
        defaultValue: 'useAuthClient must be used within an AuthProvider',
      })
    case 'useEditorOutsideProvider':
      return t('angular.error.useEditorOutsideProvider', undefined, {
        defaultValue: 'useEditorProvider must be used within an EditorProvider',
      })
    case 'useHttpOutsideProvider':
      return t('angular.error.useHttpOutsideProvider', undefined, {
        defaultValue: 'useHttpClient must be used within an HttpProvider',
      })
    case 'useLoggerOutsideProvider':
      return t('angular.error.useLoggerOutsideProvider', undefined, {
        defaultValue: 'useLoggerProvider must be used within a LoggerProvider',
      })
    case 'usePreviewOutsideProvider':
      return t('angular.error.usePreviewOutsideProvider', undefined, {
        defaultValue: 'usePreviewProvider must be used within a PreviewProvider',
      })
    case 'useRouterOutsideProvider':
      return t('angular.error.useRouterOutsideProvider', undefined, {
        defaultValue: 'useRouterInstance must be used within a RouterProvider',
      })
    case 'useStorageOutsideProvider':
      return t('angular.error.useStorageOutsideProvider', undefined, {
        defaultValue: 'useStorageProvider must be used within a StorageProvider',
      })
    case 'useThemeOutsideProvider':
      return t('angular.error.useThemeOutsideProvider', undefined, {
        defaultValue: 'useThemeProvider must be used within a ThemeProvider',
      })
    case 'useWorkspaceOutsideProvider':
      return t('angular.error.useWorkspaceOutsideProvider', undefined, {
        defaultValue: 'useWorkspaceProvider must be used within a WorkspaceProvider',
      })
  }
}

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
 * @returns The service.
 * @throws {Error} When no provider registered the token.
 */
export function injectProvider<T>(token: InjectionToken<T>, key: ProviderErrorKey): T {
  const provider = inject(token, { optional: true })
  if (!provider) {
    throw new Error(providerErrorMessage(key))
  }
  return provider
}
