import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'
import { useOAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

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

const DEFAULT_PROVIDER_KEYS: Record<string, { key: string; default: string }> = {
  github: { key: 'oauth.github', default: 'GitHub' },
  gitlab: { key: 'oauth.gitlab', default: 'GitLab' },
  google: { key: 'oauth.google', default: 'Google' },
  twitter: { key: 'oauth.twitter', default: 'Twitter' },
  x: { key: 'oauth.x', default: 'X' },
  apple: { key: 'oauth.apple', default: 'Apple' },
  facebook: { key: 'oauth.facebook', default: 'Facebook' },
  microsoft: { key: 'oauth.microsoft', default: 'Microsoft' },
  linkedin: { key: 'oauth.linkedin', default: 'LinkedIn' },
  discord: { key: 'oauth.discord', default: 'Discord' },
}

/**
 * OAuth provider button row rendered beneath a login/signup form.
 *
 * Reads providers from `useOAuth(oauthConfig)` and renders each one with
 * the canonical brand logo from `@molecule/app-oauth-logos-react` — so
 * GitHub / Google / GitLab / Twitter/X / Apple / Facebook / Microsoft /
 * LinkedIn / Discord all render pixel-identically across every app.
 *
 * Button chrome (padding, radius, gap, background, width) comes from
 * the wired ClassMap — apps can restyle by swapping the ClassMap bond
 * or by pulling the primitives directly from `@molecule/app-oauth-logos-react`
 * into their own custom button layout.
 * @param root0
 * @param root0.oauthConfig
 * @param root0.className
 * @param root0.iconSize
 * @param root0.iconMode
 * @param root0.showLabels
 * @param root0.dividerKey
 * @param root0.dividerDefault
 */
export function OAuthButtons({
  oauthConfig,
  className,
  iconSize = 30,
  iconMode = 'brand',
  showLabels = false,
  dividerKey = 'oauth.orContinueWith',
  dividerDefault = 'or continue with',
}: OAuthButtonsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { providers, redirect } = useOAuth(oauthConfig)

  if (!providers.length) return null

  /**
   *
   * @param provider
   */
  function labelFor(provider: string): string {
    const entry = DEFAULT_PROVIDER_KEYS[provider]
    return entry ? t(entry.key, {}, { defaultValue: entry.default }) : provider
  }

  return (
    <div className={className}>
      <div className={cm.oauthDivider}>
        <div className={cm.oauthDividerLine} />
        <span className={cm.oauthDividerText}>
          {t(dividerKey, {}, { defaultValue: dividerDefault })}
        </span>
      </div>
      <div className={cm.oauthButtonGroup}>
        {providers.map((provider: string) => {
          const label = labelFor(provider)
          return (
            <button
              key={provider}
              type="button"
              onClick={() => redirect(provider)}
              aria-label={t(
                'oauth.continueWith',
                { provider: label },
                { defaultValue: 'Continue with {{provider}}' },
              )}
              className={cm.oauthButton}
            >
              <span className={cm.oauthButtonIcon}>
                <OAuthProviderLogo
                  provider={provider}
                  size={iconSize}
                  mode={iconMode}
                  ariaLabel=""
                />
              </span>
              {showLabels && <span className={cm.oauthProviderLabel}>{label}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
