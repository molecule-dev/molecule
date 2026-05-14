import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { SafeLink } from '../SafeLink.js'

/**
 * Render `<SafeLink>` inside a MemoryRouter seeded at `currentPath` and
 * return the rendered HTML. Server-side rendering keeps the test free of
 * a jsdom dependency — we only need to assert the emitted `href`.
 */
function renderAt(currentPath: string, props: { to: string; children?: string }): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [currentPath] },
      createElement(SafeLink, props, props.children ?? 'link'),
    ),
  )
}

/** Pull the `href` attribute out of the single anchor in the markup. */
function hrefOf(html: string): string | null {
  const m = html.match(/href="([^"]*)"/)
  return m ? m[1] : null
}

describe('SafeLink', () => {
  it('renders an anchor with the children as content', () => {
    const html = renderAt('/dashboard', { to: '/settings', children: 'Settings' })
    expect(html).toContain('<a')
    expect(html).toContain('>Settings</a>')
  })

  it('leaves the href untouched when target differs from the current path', () => {
    const html = renderAt('/dashboard', { to: '/settings' })
    expect(hrefOf(html)).toBe('/settings')
  })

  it('appends #top when target exactly matches the current path', () => {
    const html = renderAt('/settings', { to: '/settings' })
    expect(hrefOf(html)).toBe('/settings#top')
  })

  it('treats current path + trailing slash as a same-path match', () => {
    // location.pathname === '/settings', to === '/settings/' → samePath via
    // the `pathname + '/' === to` branch; trailing slash is stripped before #top.
    const html = renderAt('/settings', { to: '/settings/' })
    expect(hrefOf(html)).toBe('/settings#top')
  })

  it('strips a trailing slash from the target before appending #top', () => {
    const html = renderAt('/blog/', { to: '/blog/' })
    expect(hrefOf(html)).toBe('/blog#top')
  })

  it('does not match when only a path prefix overlaps', () => {
    const html = renderAt('/settings', { to: '/settings/profile' })
    expect(hrefOf(html)).toBe('/settings/profile')
  })

  it('forwards arbitrary anchor props (className, etc.) to the underlying Link', () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/x'] },
        createElement(SafeLink, { to: '/y', className: 'nav-item' }, 'Y'),
      ),
    )
    expect(html).toContain('class="nav-item"')
  })

  it('exposes a default export equal to the named export', async () => {
    const mod = await import('../SafeLink.js')
    expect(mod.default).toBe(mod.SafeLink)
  })
})
