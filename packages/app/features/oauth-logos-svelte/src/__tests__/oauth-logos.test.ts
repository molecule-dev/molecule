// @vitest-environment jsdom
/**
 * Port of `@molecule/app-oauth-logos-react`'s own unit tests to Svelte: every
 * mark's accessibility attributes, size, mode and geometry, and the
 * dispatcher's provider routing and fallback.
 *
 * React's tests SSR-render to markup; the Svelte counterpart mounts into
 * jsdom and asserts on the rendered DOM — the same behavioral assertions.
 */
import { type Component, flushSync, mount, unmount } from 'svelte'
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
} from '../index.js'

/** The component mounted by the running test, torn down after each. */
let instance: ReturnType<typeof mount> | null = null

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = null
  document.body.innerHTML = ''
})

/** Mounts a component into a fresh container and returns the container. */
const render = (
  component: Component<Record<string, unknown>>,
  props: Record<string, unknown> = {},
): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  instance = mount(component, { target: container, props })
  flushSync()
  return container
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
    const svg = render(logo as Component<Record<string, unknown>>, {}).querySelector('svg')!
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('aria-label')).toBe(label)
    expect(svg.getAttribute('role')).toBe('img')
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
  })

  it.each(LOGOS)('%s defaults to a 20px square', (_n, logo) => {
    const svg = render(logo as Component<Record<string, unknown>>, {}).querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('20')
    expect(svg.getAttribute('height')).toBe('20')
  })

  it.each(LOGOS)('%s honours an explicit size', (_n, logo) => {
    const svg = render(logo as Component<Record<string, unknown>>, { size: 32 }).querySelector(
      'svg',
    )!
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('height')).toBe('32')
  })

  it.each(LOGOS)('%s renders aria-hidden (no role/label) when ariaLabel is ""', (_n, logo) => {
    const svg = render(logo as Component<Record<string, unknown>>, { ariaLabel: '' }).querySelector(
      'svg',
    )!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('role')).toBeNull()
    expect(svg.getAttribute('aria-label')).toBeNull()
  })

  it.each(LOGOS)('%s renders a <title> element when title is set', (_n, logo) => {
    const svg = render(logo as Component<Record<string, unknown>>, {
      title: 'Sign in',
    }).querySelector('svg')!
    expect(svg.querySelector('title')?.textContent).toBe('Sign in')
  })

  it.each(LOGOS)('%s forwards className to the <svg>', (_n, logo) => {
    const svg = render(logo as Component<Record<string, unknown>>, {
      className: 'logo-cls',
    }).querySelector('svg')!
    expect(svg.getAttribute('class')).toBe('logo-cls')
  })

  it.each(LOGOS)('%s emits drawable geometry (<path> or <rect>)', (_n, logo) => {
    const svg = render(logo as Component<Record<string, unknown>>, {}).querySelector('svg')!
    // 8 marks use <path>; Microsoft's mark is 4 colored <rect> squares.
    expect(svg.querySelector('path, rect')).not.toBeNull()
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
  ])('dispatches "%s" to the logo with default label "%s"', async (provider, label) => {
    const svg = render(OAuthProviderLogo as Component<Record<string, unknown>>, {
      provider,
    }).querySelector('svg')!
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('aria-label')).toBe(label)
  })

  it('renders the fallback for an unknown provider', async () => {
    const { default: FallbackHost } = await import('./FallbackHost.svelte')
    const container = render(FallbackHost as Component<Record<string, unknown>>, {
      provider: 'myspace',
    })
    expect(container.querySelector('span')?.textContent).toBe('n/a')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders nothing for an unknown provider when no fallback is given', () => {
    const container = render(OAuthProviderLogo as Component<Record<string, unknown>>, {
      provider: 'unknown',
    })
    expect(container.childElementCount).toBe(0)
    expect(container.textContent).toBe('')
  })

  it('treats "twitter" and "x" as the same mark', async () => {
    const twitter = render(OAuthProviderLogo as Component<Record<string, unknown>>, {
      provider: 'twitter',
    }).innerHTML
    await unmount(instance!)
    instance = null
    document.body.innerHTML = ''
    const x = render(OAuthProviderLogo as Component<Record<string, unknown>>, {
      provider: 'x',
    }).innerHTML
    expect(twitter).toBe(x)
  })

  it('forwards size + ariaLabel through to the dispatched logo', () => {
    const svg = render(OAuthProviderLogo as Component<Record<string, unknown>>, {
      provider: 'github',
      size: 40,
      ariaLabel: 'Continue with GitHub',
    }).querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('40')
    expect(svg.getAttribute('aria-label')).toBe('Continue with GitHub')
  })
})
