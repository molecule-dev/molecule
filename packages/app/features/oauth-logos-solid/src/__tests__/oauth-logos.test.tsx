// @vitest-environment jsdom
/**
 * Port of `@molecule/app-oauth-logos-react`'s own unit tests: every logo and
 * the dispatcher, rendered with Solid and asserted on the same DOM.
 *
 * @module
 */

import { createComponent, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import {
  AppleLogo,
  DiscordLogo,
  FacebookLogo,
  GitHubLogo,
  GitLabLogo,
  GoogleLogo,
  LinkedInLogo,
  MicrosoftLogo,
  OAuthProviderLogo,
  TwitterLogo,
  XLogo,
} from '../index.js'

const mounts: (() => void)[] = []

afterEach(() => {
  for (const dispose of mounts.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders a component into the body and returns the mount's inner HTML (comment anchors stripped). */
const html = (component: () => JSX.Element, props: Record<string, unknown> = {}): string => {
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  mounts.push(render(() => createComponent(component as () => JSX.Element, props), mount))
  return mount.innerHTML.replaceAll(/<!--[\s\S]*?-->/g, '')
}

// [component name, component, default aria-label]. Twitter's mark is the
// post-rebrand "X", but its accessible name still carries "(Twitter)".
const LOGOS = [
  ['GitHubLogo', GitHubLogo, 'GitHub'],
  ['GitLabLogo', GitLabLogo, 'GitLab'],
  ['GoogleLogo', GoogleLogo, 'Google'],
  ['TwitterLogo', TwitterLogo, 'X (Twitter)'],
  ['AppleLogo', AppleLogo, 'Apple'],
  ['FacebookLogo', FacebookLogo, 'Facebook'],
  ['MicrosoftLogo', MicrosoftLogo, 'Microsoft'],
  ['LinkedInLogo', LinkedInLogo, 'LinkedIn'],
  ['DiscordLogo', DiscordLogo, 'Discord'],
] as const

describe('individual provider logos', () => {
  it.each(LOGOS)('%s renders an <svg> with its default brand aria-label', (_n, logo, label) => {
    const markup = html(logo)
    expect(markup.startsWith('<svg')).toBe(true)
    expect(markup).toContain(`aria-label="${label}"`)
    expect(markup).toContain('role="img"')
    expect(markup).toContain('viewBox="0 0 24 24"')
  })

  it.each(LOGOS)('%s defaults to a 20px square', (_n, logo) => {
    const markup = html(logo)
    expect(markup).toContain('width="20"')
    expect(markup).toContain('height="20"')
  })

  it.each(LOGOS)('%s honours an explicit size', (_n, logo) => {
    const markup = html(logo, { size: 32 })
    expect(markup).toContain('width="32"')
    expect(markup).toContain('height="32"')
  })

  it.each(LOGOS)('%s renders aria-hidden (no role/label) when ariaLabel is ""', (_n, logo) => {
    const markup = html(logo, { ariaLabel: '' })
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).not.toContain('role="img"')
    expect(markup).not.toContain('aria-label=')
  })

  it.each(LOGOS)('%s renders a <title> element when title is set', (_n, logo) => {
    const markup = html(logo, { title: 'Sign in' })
    expect(markup).toContain('<title>Sign in</title>')
  })

  it.each(LOGOS)('%s forwards className to the <svg>', (_n, logo) => {
    const markup = html(logo, { className: 'logo-cls' })
    expect(markup).toContain('class="logo-cls"')
  })

  it.each(LOGOS)('%s emits drawable geometry (<path> or <rect>)', (_n, logo) => {
    const markup = html(logo)
    // 8 marks use <path>; Microsoft's mark is 4 colored <rect> squares.
    expect(/<(path|rect)\b/.test(markup)).toBe(true)
  })
})

describe('OAuthProviderLogo dispatcher', () => {
  // The dispatcher renders each provider's logo with no overriding aria-label,
  // so the dispatched output carries that logo's *default* brand label.
  it.each([
    ['github', 'GitHub'],
    ['gitlab', 'GitLab'],
    ['google', 'Google'],
    ['twitter', 'X (Twitter)'],
    ['x', 'X (Twitter)'],
    ['apple', 'Apple'],
    ['facebook', 'Facebook'],
    ['microsoft', 'Microsoft'],
    ['linkedin', 'LinkedIn'],
    ['discord', 'Discord'],
  ] as const)('dispatches "%s" to the logo with default label "%s"', (provider, label) => {
    const markup = html(OAuthProviderLogo, { provider })
    expect(markup.startsWith('<svg')).toBe(true)
    expect(markup).toContain(`aria-label="${label}"`)
  })

  it('renders the fallback for an unknown provider', () => {
    const markup = html(OAuthProviderLogo, {
      provider: 'myspace',
      fallback: <span>n/a</span>,
    })
    expect(markup).toBe('<span>n/a</span>')
    expect(markup).not.toContain('<svg')
  })

  it('renders nothing for an unknown provider when no fallback is given', () => {
    expect(html(OAuthProviderLogo, { provider: 'unknown' })).toBe('')
  })

  it('treats "twitter" and "x" as the same mark', () => {
    expect(html(OAuthProviderLogo, { provider: 'twitter' })).toBe(
      html(OAuthProviderLogo, { provider: 'x' }),
    )
  })

  it('forwards size + ariaLabel through to the dispatched logo', () => {
    const markup = html(OAuthProviderLogo, {
      provider: 'github',
      size: 40,
      ariaLabel: 'Continue with GitHub',
    })
    expect(markup).toContain('width="40"')
    expect(markup).toContain('aria-label="Continue with GitHub"')
  })

  it('exports XLogo as the same mark as TwitterLogo', () => {
    expect(XLogo).toBe(TwitterLogo)
  })
})
