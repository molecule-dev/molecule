// @vitest-environment jsdom
/**
 * Ports of `@molecule/app-oauth-logos-react/src/__tests__/oauth-logos.test.tsx`:
 * every behavioral assertion of the React package's own suite, rendered here
 * with the same real-DOM approach the Angular conformance adapter uses.
 *
 * @module
 */

import { reflectComponentType, type Type } from '@angular/core'
import { describe, expect, it } from 'vitest'

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
import { renderFixture } from './render.js'

// [test name, component class, default aria-label]. Twitter's mark is the
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

/** The host attribute of a component whose selector is `svg[mol-x-logo]`. */
const selectorOf = (component: Type<unknown>): string => {
  const mirror = reflectComponentType(component)
  if (!mirror) throw new Error('not a component')
  const attr = /\[([\w-]+)\]/.exec(mirror.selector)
  if (!attr) throw new Error(`unexpected selector ${mirror.selector}`)
  return attr[1]
}

describe('individual provider logos', () => {
  it.each(LOGOS)(
    '%s renders an <svg> with its default brand aria-label',
    async (_n, logo, label) => {
      const { host, destroy } = await renderFixture(`<svg ${selectorOf(logo)} />`, {}, [logo])
      const svg = host.querySelector('svg')
      expect(svg).not.toBeNull()
      expect(svg!.getAttribute('aria-label')).toBe(label)
      expect(svg!.getAttribute('role')).toBe('img')
      expect(svg!.getAttribute('viewBox')).toBe('0 0 24 24')
      await destroy()
    },
  )

  it.each(LOGOS)('%s defaults to a 20px square', async (_n, logo) => {
    const { host, destroy } = await renderFixture(`<svg ${selectorOf(logo)} />`, {}, [logo])
    const svg = host.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('20')
    expect(svg.getAttribute('height')).toBe('20')
    await destroy()
  })

  it.each(LOGOS)('%s honours an explicit size', async (_n, logo) => {
    const { host, destroy } = await renderFixture(
      `<svg ${selectorOf(logo)} [size]="p['size']" />`,
      { size: 32 },
      [logo],
    )
    const svg = host.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('height')).toBe('32')
    await destroy()
  })

  it.each(LOGOS)(
    '%s renders aria-hidden (no role/label) when ariaLabel is ""',
    async (_n, logo) => {
      const { host, destroy } = await renderFixture(
        `<svg ${selectorOf(logo)} [ariaLabel]="p['ariaLabel']" />`,
        { ariaLabel: '' },
        [logo],
      )
      const svg = host.querySelector('svg')!
      expect(svg.getAttribute('aria-hidden')).toBe('true')
      expect(svg.getAttribute('role')).toBeNull()
      expect(svg.getAttribute('aria-label')).toBeNull()
      await destroy()
    },
  )

  it.each(LOGOS)('%s renders a <title> element when title is set', async (_n, logo) => {
    const { host, destroy } = await renderFixture(
      `<svg ${selectorOf(logo)} [title]="p['title']" />`,
      { title: 'Sign in' },
      [logo],
    )
    const title = host.querySelector('title')
    expect(title?.textContent).toBe('Sign in')
    await destroy()
  })

  it.each(LOGOS)('%s forwards className to the <svg>', async (_n, logo) => {
    const { host, destroy } = await renderFixture(
      `<svg ${selectorOf(logo)} [className]="p['className']" />`,
      { className: 'logo-cls' },
      [logo],
    )
    const svg = host.querySelector('svg')!
    expect(svg.getAttribute('class')).toBe('logo-cls')
    await destroy()
  })

  it.each(LOGOS)('%s emits drawable geometry (<path> or <rect>)', async (_n, logo) => {
    const { host, destroy } = await renderFixture(`<svg ${selectorOf(logo)} />`, {}, [logo])
    // 8 marks use <path>; Microsoft's mark is 4 colored <rect> squares.
    expect(host.querySelector('path, rect')).not.toBeNull()
    await destroy()
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
  ] as const)('dispatches "%s" to the logo with default label "%s"', async (provider, label) => {
    const { host, destroy } = await renderFixture(
      `<mol-oauth-provider-logo [provider]="p['provider']" />`,
      { provider },
      [OAuthProviderLogo],
    )
    const svg = host.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('aria-label')).toBe(label)
    await destroy()
  })

  it('renders the fallback for an unknown provider', async () => {
    const { host, destroy } = await renderFixture(
      `<mol-oauth-provider-logo [provider]="p['provider']"><span ngProjectAs="[slot=fallback]">n/a</span></mol-oauth-provider-logo>`,
      { provider: 'myspace' },
      [OAuthProviderLogo],
    )
    expect(host.querySelector('span')?.textContent).toBe('n/a')
    expect(host.querySelector('svg')).toBeNull()
    await destroy()
  })

  it('renders nothing for an unknown provider when no fallback is given', async () => {
    const { host, destroy } = await renderFixture(
      `<mol-oauth-provider-logo [provider]="p['provider']" />`,
      { provider: 'unknown' },
      [OAuthProviderLogo],
    )
    expect(host.querySelector('svg')).toBeNull()
    expect(host.textContent!.trim()).toBe('')
    await destroy()
  })

  it('treats "twitter" and "x" as the same mark', async () => {
    const twitter = await renderFixture(`<mol-oauth-provider-logo [provider]="'twitter'" />`, {}, [
      OAuthProviderLogo,
    ])
    const x = await renderFixture(`<mol-oauth-provider-logo [provider]="'x'" />`, {}, [
      OAuthProviderLogo,
    ])
    // Comment containers differ between the two @switch branches; the mark
    // itself is what the two providers render.
    expect(x.host.querySelector('svg')!.outerHTML).toBe(
      twitter.host.querySelector('svg')!.outerHTML,
    )
    await twitter.destroy()
    await x.destroy()
  })

  it('forwards size + ariaLabel through to the dispatched logo', async () => {
    const { host, destroy } = await renderFixture(
      `<mol-oauth-provider-logo [provider]="p['provider']" [size]="p['size']" [ariaLabel]="p['ariaLabel']" />`,
      { provider: 'github', size: 40, ariaLabel: 'Continue with GitHub' },
      [OAuthProviderLogo],
    )
    const svg = host.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('40')
    expect(svg.getAttribute('aria-label')).toBe('Continue with GitHub')
    await destroy()
  })
})
