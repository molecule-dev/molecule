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
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import SocialShareButtons from '../SocialShareButtons.svelte'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts `SocialShareButtons` with the given props and returns the row element.
 *
 * @param props - The row's props.
 * @returns The outer wrapper div (React's root).
 */
function render(props: Record<string, unknown> = {}): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(
    mount(Host, {
      target: host,
      props: { config: {}, setMoleculeContext, component: SocialShareButtons, props },
    }),
  )
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
    expect(root.querySelector('button')?.getAttribute('aria-label')).toBe('copy')
  })

  it('forwards className', () => {
    const root = render({ url: 'https://x.test', className: 'ssb-cls' })
    expect(root.getAttribute('class')).toContain('ssb-cls')
  })
})
