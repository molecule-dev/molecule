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
   * Typically the `string[]` from `useOAuth(config).providers`. Known
   * canonical ids (e.g. `'google'`, `'github'` — see `OAuthProviderId`)
   * get their brand logo + localized label; unknown ids fall through to
   * a synthesized label and a ClassMap-neutral button, so any string is
   * safe to pass.
   */
  providers: string[]
  /**
   * Optional click handler. Called with the provider id when the user
   * activates a button.
   *
   * If omitted, buttons render as plain `<button type="button">` with no
   * default behavior — host apps wire the handler (typically calling
   * `redirect(provider)` from `useOAuth(...)` or the auth bond's
   * `signInWithProvider(provider)`).
   */
  onSelect?: (provider: string) => void
  /**
   * RESERVED — not currently invoked by this component. The full-page
   * `redirect(provider)` flow never returns to the caller, so there is
   * nothing to call it on. Kept for API compatibility with popup/PKCE
   * hosts that resolve the handshake inline and invoke it themselves.
   */
  onSuccess?: (provider: string) => void
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
   * When true, paint each button with its provider's brand-spec
   * background/foreground colors (Google white, GitHub `#24292f`, etc.)
   * via inline `style`. Defaults to `false` — buttons stay
   * ClassMap-neutral so the row is visually uniform.
   *
   * Independent of `iconMode`: `iconMode` controls the *logo's* color
   * rendering, `brandButtons` controls the *button surface*.
   */
  brandButtons?: boolean
  /**
   * When true, render the localized provider label text next to the
   * logo (e.g. `"Continue with GitHub"`). Defaults to `false` (icon-only
   * pixel-identical row across providers).
   */
  showLabels?: boolean
  /** Extra class composed onto the button-group element. */
  className?: string
}

/**
 * Props accepted by `<OAuthDivider />` — the "or continue with" rule
 * rendered above an OAuth button row.
 */
export interface OAuthDividerProps {
  /**
   * i18n key for the divider label. Defaults to `'oauth.orContinueWith'`.
   */
  labelKey?: string
  /**
   * Fallback divider text if the i18n key is missing. Defaults to
   * `'or continue with'`.
   */
  labelDefault?: string
  /** Extra class composed onto the divider wrapper. */
  className?: string
}
