// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `SocialShareButtons` — a port of
 * `@molecule/app-social-share-buttons-react/src/__tests__/social-share-buttons.test.tsx`:
 * the same behavioral assertions, mounted with a real Svelte 5 render (jsdom),
 * the bonded ClassMap and the bonded i18n provider.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import SocialShareButtons from '../SocialShareButtons.svelte'
import type { SocialShareButtonsProps } from '../types.js'

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

const copyTextWithFallbackMock = vi.mocked(copyTextWithFallback)

beforeEach(() => {
  copyTextWithFallbackMock.mockReset()
  copyTextWithFallbackMock.mockResolvedValue(true)
})

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts `SocialShareButtons` with the given props and returns the row element.
 *
 * @param props - The row's props.
 * @returns The outer wrapper div (React's root).
 */
function render(props: SocialShareButtonsProps): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(mount(SocialShareButtons, { target: host, props }))
  flushSync()
  const root = host.firstElementChild
  if (!(root instanceof HTMLElement)) throw new Error('no row rendered')
  return root
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

describe('SocialShareButtons', () => {
  it('renders the default platform set (twitter, linkedin, facebook, copy)', () => {
    const markup = render({ url: 'https://x.test/post' }).innerHTML
    expect(markup).toContain('twitter.com/intent/tweet')
    expect(markup).toContain('linkedin.com/sharing')
    expect(markup).toContain('facebook.com/sharer')
    // the 3 link platforms render as <a>; copy renders as a bare button
    expect(markup.match(/<a /g) ?? []).toHaveLength(3)
  })

  it('encodes the url into each share link', () => {
    const markup = render({ url: 'https://x.test/a b' }).innerHTML
    expect(markup).toContain(encodeURIComponent('https://x.test/a b'))
  })

  it('honours a custom platform list and order', () => {
    const markup = render({ url: 'https://x.test', platforms: ['reddit', 'email'] }).innerHTML
    expect(markup).toContain('reddit.com/submit')
    expect(markup).toContain('mailto:')
    expect(markup).not.toContain('twitter.com')
  })

  it('renders the copy platform as a button with an aria-label', () => {
    const root = render({ url: 'https://x.test', platforms: ['copy'] })
    expect(root.innerHTML).toContain('<button')
    expect(root.querySelector('button')?.getAttribute('aria-label')).toBe('Copy')
  })

  it('forwards className', () => {
    const root = render({ url: 'https://x.test', className: 'ssb-cls' })
    expect(root.getAttribute('class')).toContain('ssb-cls')
  })

  it('copies the url when the copy button is clicked', async () => {
    const root = render({ url: 'https://x.test/click', platforms: ['copy'] })
    const button = root.querySelector('button')
    if (!button) throw new Error('no copy button rendered')
    button.click()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    flushSync()
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/click')
    expect(button.textContent).toContain('Copied!')
  })

  it('leaves the copied state off when the copy reports failure', async () => {
    copyTextWithFallbackMock.mockResolvedValue(false)
    const root = render({ url: 'https://x.test/click', platforms: ['copy'] })
    const button = root.querySelector('button')
    if (!button) throw new Error('no copy button rendered')
    button.click()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    flushSync()
    expect(copyTextWithFallbackMock).toHaveBeenCalledTimes(1)
    expect(copyTextWithFallbackMock).toHaveBeenCalledWith('https://x.test/click')
    expect(button.textContent).not.toContain('Copied!')
    expect(button.textContent).toContain('⧉')
  })
})

describe('SocialShareButtons platform label keys', () => {
  /** The English name each platform's label falls back to (the bond's en.ts text). */
  const ENGLISH: Record<string, string> = {
    twitter: 'Twitter',
    x: 'X',
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    reddit: 'Reddit',
    email: 'Email',
    copy: 'Copy',
  }

  /** Every platform the component's union can take, in its order. */
  const PLATFORMS = ['twitter', 'x', 'linkedin', 'facebook', 'reddit', 'email', 'copy'] as const

  it('resolves every platform label through its literal key', () => {
    // One literal `share.<platform>` key per platform: the provider translates
    // each key to its marker, so a rendered marker proves the component asked
    // for that exact literal key (a runtime-built key would miss).
    const provider = createSimpleI18nProvider('en')
    provider.addTranslations(
      'en',
      Object.fromEntries(PLATFORMS.map((p) => [`share.${p}`, `[share.${p}]`])),
    )
    setProvider(provider)
    const markup = render({ url: 'https://x.test', platforms: [...PLATFORMS] }).innerHTML
    for (const p of PLATFORMS) {
      expect(markup).toContain(`aria-label="[share.${p}]"`)
    }
  })

  it('falls back to the English platform name when no translation is loaded', () => {
    // a clean provider carrying no translations: the inline English default is
    // the platform's name — the bond's en.ts text
    setProvider(createSimpleI18nProvider('en'))
    const markup = render({ url: 'https://x.test', platforms: [...PLATFORMS] }).innerHTML
    for (const p of PLATFORMS) {
      expect(markup).toContain(`aria-label="${ENGLISH[p]}"`)
    }
  })
})
