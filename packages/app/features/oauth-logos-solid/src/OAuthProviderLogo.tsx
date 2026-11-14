import { type Component, type JSX, Match, splitProps, Switch } from 'solid-js'

import { AppleLogo } from './AppleLogo.jsx'
import { DiscordLogo } from './DiscordLogo.jsx'
import { FacebookLogo } from './FacebookLogo.jsx'
import { GitHubLogo } from './GitHubLogo.jsx'
import { GitLabLogo } from './GitLabLogo.jsx'
import { GoogleLogo } from './GoogleLogo.jsx'
import { LinkedInLogo } from './LinkedInLogo.jsx'
import { MicrosoftLogo } from './MicrosoftLogo.jsx'
import { TwitterLogo } from './TwitterLogo.jsx'
import type { OAuthLogoProps, OAuthProviderId } from './types.js'

/** Props for {@link OAuthProviderLogo}. */
export interface OAuthProviderLogoProps extends OAuthLogoProps {
  provider: OAuthProviderId | string
  /** Rendered when `provider` has no registered logo (default: `null`). */
  fallback?: JSX.Element
}

/**
 * Dispatcher: renders the canonical logo for a given provider id.
 *
 * Use this in OAuth button rows so the button chrome (padding, radius,
 * width, background) stays per-app while the logo itself is identical
 * across every consumer.
 *
 * @param props - Component props (see {@link OAuthProviderLogoProps}).
 * @example
 * ```tsx
 * <OAuthProviderLogo provider="github" size={20} mode="mono" />
 * <OAuthProviderLogo provider="google" size={24} />
 * ```
 */
export const OAuthProviderLogo: Component<OAuthProviderLogoProps> = (props) => {
  // The dispatched logo takes every prop except the dispatcher's own two;
  // splitProps keeps them reactive (no destructure).
  const [, rest] = splitProps(props, ['provider', 'fallback'])
  return (
    <Switch fallback={props.fallback ?? null}>
      <Match when={props.provider === 'github'}>
        <GitHubLogo {...rest} />
      </Match>
      <Match when={props.provider === 'gitlab'}>
        <GitLabLogo {...rest} />
      </Match>
      <Match when={props.provider === 'google'}>
        <GoogleLogo {...rest} />
      </Match>
      <Match when={props.provider === 'twitter' || props.provider === 'x'}>
        <TwitterLogo {...rest} />
      </Match>
      <Match when={props.provider === 'apple'}>
        <AppleLogo {...rest} />
      </Match>
      <Match when={props.provider === 'facebook'}>
        <FacebookLogo {...rest} />
      </Match>
      <Match when={props.provider === 'microsoft'}>
        <MicrosoftLogo {...rest} />
      </Match>
      <Match when={props.provider === 'linkedin'}>
        <LinkedInLogo {...rest} />
      </Match>
      <Match when={props.provider === 'discord'}>
        <DiscordLogo {...rest} />
      </Match>
    </Switch>
  )
}
