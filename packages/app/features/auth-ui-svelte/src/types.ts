/**
 * Public types for `@molecule/app-auth-ui-svelte`.
 *
 * @module
 */

import type { UseOAuthConfig } from '@molecule/app-svelte'

/** Props for {@link OAuthButtons}. */
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
  /** Override the default "or continue with" divider text. */
  dividerKey?: string
  dividerDefault?: string
  /**
   * Called after a successful OAuth login (the session is already
   * established) — e.g. `() => navigate('/dashboard')`.
   */
  onSuccess?: () => void
  /**
   * Called when the OAuth callback exchange fails. The (already visible)
   * inline error message is passed through for hosts that also want to
   * surface it elsewhere.
   */
  onError?: (error: string) => void
}
