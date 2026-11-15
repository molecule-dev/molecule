// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `SafeLink` — a port of
 * `@molecule/app-safe-link-react/src/__tests__/SafeLink.test.tsx`: the same
 * behavioral assertions, rendered with Svelte 5 in jsdom over a real memory
 * router and asserted on the markup the component produces.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import SafeLink from '../SafeLink.svelte'
import Mount from './Mount.svelte'

afterEach(() => {
  document.body.innerHTML = ''
})

/** The markup without Svelte 5's comment anchors around dynamic content. */
const withoutAnchors = (html: string): string => html.replaceAll('<!---->', '')

/**
 * Render `<SafeLink>` inside a memory router seeded at `currentPath` (through
 * the {@link Mount} wrapper) and return the rendered HTML. Mounting into jsdom
 * keeps the test free of anything but the DOM — we only need to assert the
 * emitted `href`.
 *
 * @param currentPath - The route the router starts at.
 * @param props - The link's props (`to`, plus `className` where a case needs it).
 * @param children - The link's content (default `'link'`, as in the React suite).
 * @returns The markup.
 */
async function renderAt(
  currentPath: string,
  props: { to: string; className?: string },
  children?: string,
): Promise<string> {
  const instance = mount(Mount, {
    target: document.body,
    props: {
      route: currentPath,
      to: props.to,
      className: props.className,
      text: children ?? 'link',
    },
  })
  flushSync()
  const markup = document.body.innerHTML
  await unmount(instance)
  return markup
}

/** Pull the `href` attribute out of the single anchor in the markup. */
function hrefOf(html: string): string | null {
  const m = html.match(/href="([^"]*)"/)
  return m ? m[1] : null
}

describe('SafeLink', () => {
  it('renders an anchor with the children as content', async () => {
    const html = withoutAnchors(await renderAt('/dashboard', { to: '/settings' }, 'Settings'))
    expect(html).toContain('<a')
    expect(html).toContain('>Settings</a>')
  })

  it('leaves the href untouched when target differs from the current path', async () => {
    const html = await renderAt('/dashboard', { to: '/settings' })
    expect(hrefOf(html)).toBe('/settings')
  })

  it('appends #top when target exactly matches the current path', async () => {
    const html = await renderAt('/settings', { to: '/settings' })
    expect(hrefOf(html)).toBe('/settings#top')
  })

  it('treats current path + trailing slash as a same-path match', async () => {
    // location.pathname === '/settings', to === '/settings/' → samePath via
    // the `pathname + '/' === to` branch; trailing slash is stripped before #top.
    const html = await renderAt('/settings', { to: '/settings/' })
    expect(hrefOf(html)).toBe('/settings#top')
  })

  it('strips a trailing slash from the target before appending #top', async () => {
    const html = await renderAt('/blog/', { to: '/blog/' })
    expect(hrefOf(html)).toBe('/blog#top')
  })

  it('does not match when only a path prefix overlaps', async () => {
    const html = await renderAt('/settings', { to: '/settings/profile' })
    expect(hrefOf(html)).toBe('/settings/profile')
  })

  it('forwards arbitrary anchor props (className, etc.) to the underlying Link', async () => {
    const html = await renderAt('/x', { to: '/y', className: 'nav-item' }, 'Y')
    expect(html).toContain('class="nav-item"')
  })

  it('exposes a default export equal to the named export', async () => {
    const mod = await import('../SafeLink.svelte')
    expect(mod.default).toBe(SafeLink)
  })
})
