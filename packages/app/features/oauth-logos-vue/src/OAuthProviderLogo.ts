/**
 * Vue OAuth provider logo dispatcher component.
 *
 * @module
 */

import { type Component, defineComponent, h, type PropType, type VNodeChild } from 'vue'

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

/** The logo component behind each canonical provider id. */
const LOGOS: Record<string, Component> = {
  github: GitHubLogo,
  gitlab: GitLabLogo,
  google: GoogleLogo,
  twitter: TwitterLogo,
  x: TwitterLogo,
  apple: AppleLogo,
  facebook: FacebookLogo,
  microsoft: MicrosoftLogo,
  linkedin: LinkedInLogo,
  discord: DiscordLogo,
}

/**
 * Props for {@link OAuthProviderLogo}.
 */
export interface OAuthProviderLogoProps extends OAuthLogoProps {
  provider: OAuthProviderId | string
  /**
   * Rendered when `provider` has no registered logo (default: nothing).
   * A node-valued prop: pass it as a prop or as the same-named slot.
   */
  fallback?: VNodeChild
}

/**
 * Vue dispatcher: renders the canonical logo for a given provider id.
 *
 * Counterpart of `@molecule/app-oauth-logos-react`'s `OAuthProviderLogo`,
 * with the same props and the same DOM. Use this in OAuth button rows so
 * the button chrome (padding, radius, width, background) stays per-app
 * while the logo itself is identical across every consumer. An unknown
 * provider id renders the `fallback` node — a prop or a same-named slot —
 * and nothing at all when neither is given.
 */
export const OAuthProviderLogo = defineComponent({
  name: 'OAuthProviderLogo',
  inheritAttrs: false,
  props: {
    provider: { type: String, required: true },
    size: Number,
    className: String,
    mode: { type: String as PropType<OAuthLogoProps['mode']>, default: 'brand' },
    ariaLabel: String,
    title: String,
    // `type: null` — a VNode-valued prop (see OAuthProviderLogoProps.fallback).
    fallback: null,
  },
  setup(props, { slots }) {
    return () => {
      const { provider, fallback, ...rest } = props
      const logo = LOGOS[provider]
      if (logo) return h(logo, rest)
      // No registered mark: the caller's fallback node (prop or slot), or nothing.
      const nodes = fallback ?? slots.fallback?.()
      if (nodes === undefined || nodes === null || nodes === false) return null
      return nodes
    }
  },
})
