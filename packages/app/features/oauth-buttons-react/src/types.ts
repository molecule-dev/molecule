/**
 * Public types for `@molecule/app-oauth-buttons-react`.
 *
 * @module
 */

import type { OAuthProviderId } from '@molecule/app-oauth-logos-react'

export type { OAuthProviderId }

/** Layout variants for the OAuth button row. */
export type OAuthButtonsLayout = 'horizontal' | 'vertical' | 'grid'

/**
 * Props accepted by `<OAuthButtons />`.
 */
export interface OAuthButtonsProps {
  /**
   * Ordered list of provider ids to render.
   *
   * Provider ids are normalized canonical strings (e.g. `'google'`,
   * `'github'`). Unknown ids fall through to the dispatcher's `fallback`
   * (rendered as the provider id text).
   */
  providers: OAuthProviderId[]
  /**
   * Optional click handler. Called with the canonical provider id when
   * the user activates a button.
   *
   * If omitted, buttons render as plain `<button type="button">` with no
   * default behavior — host apps wire the handler (typically calling
   * `redirect(provider)` from `useOAuth(...)` or the auth bond's
   * `signInWithProvider(provider)`).
   */
  onSelect?: (provider: OAuthProviderId) => void
  /**
   * Optional success callback. Reserved for host apps that resolve the
   * OAuth handshake inline (popup / pkce-on-page) rather than via a full
   * page redirect. Called with the canonical provider id once the
   * handshake completes successfully.
   */
  onSuccess?: (provider: OAuthProviderId) => void
  /**
   * Layout variant. Defaults to `'horizontal'` (flex-wrap row).
   *
   * - `'horizontal'`: row that wraps when crowded.
   * - `'vertical'`: stacked column (one button per line).
   * - `'grid'`: 2-column grid (recommended for >4 providers).
   */
  layout?: OAuthButtonsLayout
  /** Icon size in pixels. Defaults to 30. */
  iconSize?: number
  /** Logo color mode — `'brand'` (default, official multi-color) or `'mono'`. */
  iconMode?: 'brand' | 'mono'
  /**
   * When true, render the localized provider label text next to the
   * logo (e.g. `"Continue with GitHub"`). Defaults to `false` (icon-only
   * pixel-identical row across providers).
   */
  showLabels?: boolean
  /** Extra class applied to the outer wrapper. */
  className?: string
}
