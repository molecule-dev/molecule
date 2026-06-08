import type { JSX } from 'react'

import { OAuthButtons as OAuthButtonRow, OAuthDivider } from '@molecule/app-oauth-buttons-react'
import { useOAuth } from '@molecule/app-react'

interface OAuthButtonsProps {
  /**
   * OAuth config object consumed by `useOAuth()`. Typed as `any` here
   * because the concrete shape lives in the app's `config.ts`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oauthConfig: any
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
}

/**
 * Config-driven OAuth provider button row rendered beneath a
 * login/signup form.
 *
 * This is the convenience layer over the primitives in
 * `@molecule/app-oauth-buttons-react`: it reads `providers` + `redirect`
 * from `useOAuth(oauthConfig)`, then composes `<OAuthDivider>` (the "or
 * continue with" rule) above `<OAuthButtons>` (the button row). Apps
 * with an `oauthConfig` object use this; apps that already hold a raw
 * provider list use the lower-level `<OAuthButtons>` directly.
 *
 * @param root0 - See `OAuthButtonsProps`.
 * @param root0.oauthConfig - Config object passed to `useOAuth()`.
 * @param root0.className - Extra class on the outer wrapper.
 * @param root0.iconSize - Logo size in pixels (default 30).
 * @param root0.iconMode - Logo color mode (`'brand'` | `'mono'`).
 * @param root0.showLabels - Render provider label text next to the logo.
 * @param root0.dividerKey - i18n key for the divider label.
 * @param root0.dividerDefault - Fallback divider text.
 */
export function OAuthButtons({
  oauthConfig,
  className,
  iconSize = 30,
  iconMode = 'brand',
  showLabels = false,
  dividerKey = 'oauth.orContinueWith',
  dividerDefault = 'or continue with',
}: OAuthButtonsProps): JSX.Element | null {
  const { providers, redirect } = useOAuth(oauthConfig)

  if (!providers.length) return null

  return (
    <div className={className}>
      <OAuthDivider labelKey={dividerKey} labelDefault={dividerDefault} />
      <OAuthButtonRow
        providers={providers}
        onSelect={redirect}
        iconSize={iconSize}
        iconMode={iconMode}
        showLabels={showLabels}
      />
    </div>
  )
}
