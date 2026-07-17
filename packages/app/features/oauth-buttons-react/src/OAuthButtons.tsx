import type { JSX } from 'react'

/**
 * `<OAuthButtons />` — config-driven OAuth provider button row.
 *
 * @module
 */
import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { getBrandStyle } from './brand-styles.js'
import { dedupeProviders, getProviderLabel } from './labels.js'
import { getButtonLayoutStyle, getLayoutStyle } from './layout.js'
import type { OAuthButtonsProps } from './types.js'

/**
 * Renders one styled button per OAuth provider.
 *
 * Composes the canonical brand logos from
 * `@molecule/app-oauth-logos-react` and pulls layout / chrome from
 * the wired ClassMap (`cm.oauthButtonGroup`, `cm.oauthButton`,
 * `cm.oauthButtonIcon`). When `brandButtons` is set, each button also
 * gets its provider's exact brand-spec background via inline `style`
 * (ClassMap intentionally does not encode provider brand colors).
 *
 * This is the lower-level primitive — host apps that have an
 * `oauthConfig` object typically use the config-driven
 * `<OAuthButtons>` from `@molecule/app-auth-ui-react`, which composes
 * this row plus `<OAuthDivider>`.
 *
 * @param props - See `OAuthButtonsProps`.
 *
 * @example
 * ```tsx
 * import { OAuthButtons } from '@molecule/app-oauth-buttons-react'
 * import { useOAuth } from '@molecule/app-react'
 * import { oauthConfig } from '../config'
 *
 * function LoginPage() {
 *   const { providers, redirect } = useOAuth(oauthConfig)
 *   return (
 *     <OAuthButtons
 *       providers={providers}
 *       onSelect={redirect}
 *       layout="grid"
 *       showLabels
 *     />
 *   )
 * }
 * ```
 */
export function OAuthButtons({
  providers,
  onSelect,
  onSuccess,
  layout = 'horizontal',
  iconSize = 30,
  iconMode = 'brand',
  brandButtons = false,
  showLabels = false,
  className,
}: OAuthButtonsProps): JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()

  const ordered = dedupeProviders(providers)
  if (ordered.length === 0) return null

  /**
   * Activate a provider button: start the flow via `onSelect`, and — for an
   * inline handler that resolves the handshake in place (popup/PKCE, e.g. an
   * auth bond's `signInWithProvider`) — fire `onSuccess(provider)` on
   * completion. A full-page `redirect` onSelect returns `void`, so there is
   * nothing to await and `onSuccess` correctly never fires (that flow's
   * completion is observed on the callback page by `useOAuth(config).onSuccess`
   * instead). A rejected handshake also does not fire `onSuccess`.
   */
  const activate = (provider: string): void => {
    if (!onSelect) return
    const result = onSelect(provider)
    if (result instanceof Promise) {
      void result.then(
        () => onSuccess?.(provider),
        (_error) => {
          // The handshake failed/aborted — `onSuccess` must NOT fire. Surfacing
          // the error is the initiating `onSelect` handler's responsibility
          // (e.g. `useOAuth`'s `onError`); this presentational row only reports
          // success. Swallowing here is the documented, correct noop.
        },
      )
    }
  }

  const wrapperStyle = getLayoutStyle(layout, ordered.length)
  const buttonStyle = getButtonLayoutStyle(layout)

  return (
    <div
      className={cm.cn(cm.oauthButtonGroup, className)}
      role="group"
      aria-label={t('oauthButtons.groupLabel', undefined, {
        defaultValue: 'Continue with another account',
      })}
      style={wrapperStyle}
      data-mol-id="oauth-buttons"
      data-layout={layout}
    >
      {ordered.map((provider) => {
        const label = getProviderLabel(provider)
        const localizedName = t(label.key, undefined, { defaultValue: label.default })
        const brandStyle = brandButtons ? getBrandStyle(provider) : {}
        const ariaLabel = t(
          'oauthButtons.continueWith',
          { provider: localizedName },
          { defaultValue: 'Continue with {{provider}}' },
        )
        return (
          <button
            key={provider}
            type="button"
            onClick={onSelect ? () => activate(provider) : undefined}
            aria-label={ariaLabel}
            className={cm.oauthButton}
            data-mol-id={`oauth-button-${provider}`}
            data-provider={provider}
            style={{ ...brandStyle, ...buttonStyle }}
          >
            <span className={cm.oauthButtonIcon}>
              <OAuthProviderLogo provider={provider} size={iconSize} mode={iconMode} ariaLabel="" />
            </span>
            {showLabels && <span className={cm.oauthProviderLabel}>{localizedName}</span>}
          </button>
        )
      })}
    </div>
  )
}
