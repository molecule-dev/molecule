// @vitest-environment jsdom
/**
 * Unit tests for the Vue `SafeLink` — a port of
 * `@molecule/app-safe-link-react/src/__tests__/SafeLink.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the markup
 * the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import type { Router } from '@molecule/app-routing'
import { createMemoryRouter } from '@molecule/app-routing'
import { createRouterPlugin } from '@molecule/app-vue'

import { SafeLink } from '../SafeLink.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Render `<SafeLink>` inside a memory router seeded at `currentPath` and
 * return the rendered HTML. Mounting into jsdom keeps the test free of
 * anything but the DOM — we only need to assert the emitted `href`.
 *
 * @param currentPath - The route the router starts at.
 * @param props - The link's props (`to`, plus `className` where a case needs it).
 * @param children - The link's content (default `'link'`, as in the React suite).
 * @returns The markup.
 */
function renderAt(
  currentPath: string,
  props: { to: string; className?: string },
  children?: VNodeChild,
): string {
  const router: Router = createMemoryRouter({ initialEntries: [currentPath] })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: () =>
        h(SafeLink, props, children !== undefined ? { default: () => [children] } : undefined),
    }),
  )
  app.use(createRouterPlugin(router))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

/** Pull the `href` attribute out of the single anchor in the markup. */
function hrefOf(html: string): string | null {
  const m = html.match(/href="([^"]*)"/)
  return m ? m[1] : null
}

describe('SafeLink', () => {
  it('renders an anchor with the children as content', () => {
    const html = renderAt('/dashboard', { to: '/settings' }, 'Settings')
    expect(html).toContain('<a')
    expect(html).toContain('>Settings</a>')
  })

  it('leaves the href untouched when target differs from the current path', () => {
    const html = renderAt('/dashboard', { to: '/settings' }, 'link')
    expect(hrefOf(html)).toBe('/settings')
  })

  it('appends #top when target exactly matches the current path', () => {
    const html = renderAt('/settings', { to: '/settings' }, 'link')
    expect(hrefOf(html)).toBe('/settings#top')
  })

  it('treats current path + trailing slash as a same-path match', () => {
    // location.pathname === '/settings', to === '/settings/' → samePath via
    // the `pathname + '/' === to` branch; trailing slash is stripped before #top.
    const html = renderAt('/settings', { to: '/settings/' }, 'link')
    expect(hrefOf(html)).toBe('/settings#top')
  })

  it('strips a trailing slash from the target before appending #top', () => {
    const html = renderAt('/blog/', { to: '/blog/' }, 'link')
    expect(hrefOf(html)).toBe('/blog#top')
  })

  it('does not match when only a path prefix overlaps', () => {
    const html = renderAt('/settings', { to: '/settings/profile' }, 'link')
    expect(hrefOf(html)).toBe('/settings/profile')
  })

  it('forwards arbitrary anchor props (className, etc.) to the underlying Link', () => {
    const html = renderAt('/x', { to: '/y', className: 'nav-item' }, 'Y')
    expect(html).toContain('class="nav-item"')
  })

  it('exposes a default export equal to the named export', async () => {
    const mod = await import('../SafeLink.js')
    expect(mod.default).toBe(mod.SafeLink)
  })
})
