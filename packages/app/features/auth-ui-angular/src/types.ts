/**
 * Public types for `@molecule/app-auth-ui-angular`.
 *
 * @module
 */

import type { UseOAuthConfig } from '@molecule/app-angular'

/**
 * Props for the `OAuthButtons` component, the same as
 * `@molecule/app-auth-ui-react`'s. In a template, the value props are inputs
 * (`[oauthConfig]`, `[showLabels]`, …), and `onSuccess` / `onError` are the
 * `(success)` and `(error)` outputs.
 */
export interface OAuthButtonsProps {
  /** The app's OAuth config (`oauthConfig` in its `config.ts`), passed to `useOAuth()`. */
  oauthConfig: UseOAuthConfig
  /** Extra class applied to the outer wrapper. */
  className?: string
  /** Icon size in pixels. Defaults to 30. */
  iconSize?: number
  /** Logo color mode — `'brand'` (default, official multi-color) or `'mono'`. */
  iconMode?: 'brand' | 'mono'
  /** When true, render the provider label text next to the logo. */
  showLabels?: boolean
  /** Override the default "or continue with" divider text's i18n key. */
  dividerKey?: string
  /** Override the default "or continue with" divider text. */
  dividerDefault?: string
  /**
   * Called after a successful OAuth login (the session is already
   * established), e.g. `() => navigate('/dashboard')`. The `(success)` output.
   */
  onSuccess?: () => void
  /**
   * Called when the OAuth callback exchange fails, with the inline error
   * message that is already visible. The `(error)` output.
   */
  onError?: (error: string) => void
}
