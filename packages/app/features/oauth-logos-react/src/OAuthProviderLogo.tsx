import { AppleLogo } from './AppleLogo.js'
import { DiscordLogo } from './DiscordLogo.js'
import { FacebookLogo } from './FacebookLogo.js'
import { GitHubLogo } from './GitHubLogo.js'
import { GitLabLogo } from './GitLabLogo.js'
import { GoogleLogo } from './GoogleLogo.js'
import { LinkedInLogo } from './LinkedInLogo.js'
import { MicrosoftLogo } from './MicrosoftLogo.js'
import { TwitterLogo } from './TwitterLogo.js'
import type { OAuthLogoProps, OAuthProviderId } from './types.js'

interface OAuthProviderLogoProps extends OAuthLogoProps {
  provider: OAuthProviderId | string
  /** Rendered when `provider` has no registered logo (default: `null`). */
  fallback?: React.ReactNode
}

/**
 * Dispatcher: renders the canonical logo for a given provider id.
 *
 * Use this in OAuth button rows so the button chrome (padding, radius,
 * width, background) stays per-app while the logo itself is identical
 * across every consumer.
 *
 * @param root0
 * @param root0.provider
 * @param root0.fallback
 * @example
 * ```tsx
 * <OAuthProviderLogo provider="github" size={20} mode="mono" />
 * <OAuthProviderLogo provider="google" size={24} />
 * ```
 */
export function OAuthProviderLogo({ provider, fallback = null, ...rest }: OAuthProviderLogoProps) {
  switch (provider) {
    case 'github':
      return <GitHubLogo {...rest} />
    case 'gitlab':
      return <GitLabLogo {...rest} />
    case 'google':
      return <GoogleLogo {...rest} />
    case 'twitter':
    case 'x':
      return <TwitterLogo {...rest} />
    case 'apple':
      return <AppleLogo {...rest} />
    case 'facebook':
      return <FacebookLogo {...rest} />
    case 'microsoft':
      return <MicrosoftLogo {...rest} />
    case 'linkedin':
      return <LinkedInLogo {...rest} />
    case 'discord':
      return <DiscordLogo {...rest} />
    default:
      return <>{fallback}</>
  }
}
