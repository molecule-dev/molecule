import { Component, ElementRef, inject } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'

import { AppleLogo } from './apple-logo.component.js'
import { DiscordLogo } from './discord-logo.component.js'
import { FacebookLogo } from './facebook-logo.component.js'
import { GitHubLogo } from './github-logo.component.js'
import { GitLabLogo } from './gitlab-logo.component.js'
import { GoogleLogo } from './google-logo.component.js'
import { LinkedInLogo } from './linkedin-logo.component.js'
import { MicrosoftLogo } from './microsoft-logo.component.js'
import { TwitterLogo } from './twitter-logo.component.js'
import type { OAuthLogoProps, OAuthProviderId } from './types.js'

/**
 * Props for {@link OAuthProviderLogo} — the same shape as React's
 * `OAuthProviderLogoProps`. Every member is a component input, except
 * `fallback`, which is the content projected into `[slot=fallback]`.
 */
export interface OAuthProviderLogoProps extends OAuthLogoProps {
  /** The provider id (a canonical `OAuthProviderId` or any other string). */
  provider: OAuthProviderId | string
  /**
   * Rendered when `provider` has no registered logo (default: nothing).
   * In Angular this is projected content: `<ng-content select="[slot=fallback]">`,
   * the counterpart of React's `fallback` prop.
   */
  fallback?: unknown
}

/**
 * Dispatcher: renders the canonical logo for a given provider id.
 *
 * Use this in OAuth button rows so the button chrome (padding, radius,
 * width, background) stays per-app while the logo itself is identical
 * across every consumer.
 *
 * React's root is a fragment (the dispatched logo, the fallback, or
 * nothing), so everything the host holds renders in the host's place and the
 * host itself leaves the page: no element of its own remains. An unknown
 * provider renders nothing unless `[slot=fallback]` content is
 * projected (React's `fallback` prop).
 */
@Component({
  selector: 'mol-oauth-provider-logo',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [
    AppleLogo,
    DiscordLogo,
    FacebookLogo,
    GitHubLogo,
    GitLabLogo,
    GoogleLogo,
    LinkedInLogo,
    MicrosoftLogo,
    TwitterLogo,
  ],
  inputs: ['provider', 'size', 'className', 'mode', 'ariaLabel', 'title'],
  template: `@switch (provider) {
    @case ('github') {
      <svg
        mol-github-logo
        [size]="size"
        [className]="className"
        [ariaLabel]="ariaLabel"
        [title]="title"
      />
    }
    @case ('gitlab') {
      <svg
        mol-gitlab-logo
        [size]="size"
        [className]="className"
        [mode]="mode"
        [ariaLabel]="ariaLabel"
        [title]="title"
      />
    }
    @case ('google') {
      <svg
        mol-google-logo
        [size]="size"
        [className]="className"
        [mode]="mode"
        [ariaLabel]="ariaLabel"
        [title]="title"
      />
    }
    @case ('twitter') {
      <svg
        mol-twitter-logo
        [size]="size"
        [className]="className"
        [ariaLabel]="ariaLabel"
        [title]="title"
      />
    }
    @case ('x') {
      <svg
        mol-twitter-logo
        [size]="size"
        [className]="className"
        [ariaLabel]="ariaLabel"
        [title]="title"
      />
    }
    @case ('apple') {
      <svg
        mol-apple-logo
        [size]="size"
        [className]="className"
        [ariaLabel]="ariaLabel"
        [title]="title"
      />
    }
    @case ('facebook') {
      <svg
        mol-facebook-logo
        [size]="size"
        [className]="className"
        [mode]="mode"
        [ariaLabel]="ariaLabel"
        [title]="title"
      />
    }
    @case ('microsoft') {
      <svg
        mol-microsoft-logo
        [size]="size"
        [className]="className"
        [mode]="mode"
        [ariaLabel]="ariaLabel"
        [title]="title"
      />
    }
    @case ('linkedin') {
      <svg
        mol-linkedin-logo
        [size]="size"
        [className]="className"
        [mode]="mode"
        [ariaLabel]="ariaLabel"
        [title]="title"
      />
    }
    @case ('discord') {
      <svg
        mol-discord-logo
        [size]="size"
        [className]="className"
        [mode]="mode"
        [ariaLabel]="ariaLabel"
        [title]="title"
      />
    }
    @default {
      <ng-content select="[slot=fallback]" />
    }
  }`,
})
export class OAuthProviderLogo {
  /** The provider id (a canonical `OAuthProviderId` or any other string). */
  provider!: string
  /** Forwarded to the dispatched logo: rendered size in pixels. */
  size?: number
  /** Forwarded to the dispatched logo: className on the outer SVG element. */
  className?: string
  /** Forwarded to the dispatched logo: color mode (`'brand'` default / `'mono'`). */
  mode?: 'brand' | 'mono'
  /** Forwarded to the dispatched logo: accessible label (`''` → `aria-hidden`). */
  ariaLabel?: string
  /** Forwarded to the dispatched logo: optional `<title>` text. */
  title?: string

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root is a fragment: the dispatched logo (or the fallback content)
    // renders in the host's place, with nothing of the host left behind.
    usePlacement(() => {
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }
}
