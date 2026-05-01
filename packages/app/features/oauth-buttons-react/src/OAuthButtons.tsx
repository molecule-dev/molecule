/**
 * `<OAuthButtons />` — config-driven OAuth provider button row.
 *
 * @module
 */

import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { getBrandStyle } from './brand-styles.js'
import { getButtonLayoutStyle, getLayoutStyle } from './layout.js'
import { dedupeProviders, getProviderLabel } from './labels.js'
import type { OAuthButtonsProps } from './types.js'

/**
 * Renders one styled, brand-themed button per OAuth provider.
 *
 * Composes the canonical brand logos from
 * `@molecule/app-oauth-logos-react` and pulls layout / chrome from
 * the wired ClassMap (`cm.oauthButtonGroup`, `cm.oauthButton`,
 * `cm.oauthButtonIcon`). Brand colors are applied via inline `style`
 * because they are exact spec colors that ClassMap intentionally does
 * not encode (each provider's developer guidelines mandate them).
 *
 * Replaces the bespoke `OAuthButtons.tsx` shipped by every flagship
 * Login / Signup page today — those re-implementations all reduced
 * to the same row, just with subtly different gaps and label keys.
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
  onSuccess: _onSuccess,
  layout = 'horizontal',
  iconSize = 30,
  iconMode = 'brand',
  showLabels = false,
  className,
}: OAuthButtonsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const ordered = dedupeProviders(providers)
  if (ordered.length === 0) return null

  const wrapperStyle = getLayoutStyle(layout, ordered.length)
  const buttonStyle = getButtonLayoutStyle(layout)

  return (
    <div className={className}>
      <div
        className={cm.oauthButtonGroup}
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
          const brandStyle = iconMode === 'brand' ? getBrandStyle(provider) : {}
          const ariaLabel = t(
            'oauthButtons.continueWith',
            { provider: localizedName },
            { defaultValue: 'Continue with {{provider}}' },
          )
          return (
            <button
              key={provider}
              type="button"
              onClick={onSelect ? () => onSelect(provider) : undefined}
              aria-label={ariaLabel}
              className={cm.oauthButton}
              data-mol-id={`oauth-button-${provider}`}
              data-provider={provider}
              style={{ ...brandStyle, ...buttonStyle }}
            >
              <span className={cm.oauthButtonIcon}>
                <OAuthProviderLogo
                  provider={provider}
                  size={iconSize}
                  mode={iconMode}
                  ariaLabel=""
                />
              </span>
              {showLabels && <span className={cm.oauthProviderLabel}>{localizedName}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
