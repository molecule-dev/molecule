// @vitest-environment jsdom
/**
 * The in-app link click rule (`followRouterLink`) and its two parts, against
 * react-router `<Link>`'s behavior. Every framework binding's `Link` is held
 * to the same rule by `@molecule/app-framework-conformance/link`.
 */
import { describe, expect, it } from 'vitest'

import { followRouterLink, isRouterLinkClick, resolveLinkPath, routerLinkHref } from '../link.js'
import { createMemoryRouter } from '../router.js'

/**
 * Dispatches a click on a fresh anchor and runs `handle` inside it.
 *
 * @param init - The click's modifier keys and button.
 * @param attrs - Attributes for the anchor.
 * @param handle - Called with the event during dispatch.
 * @returns The event after dispatch.
 */
const clickAnchor = (
  init: MouseEventInit,
  attrs: Record<string, string>,
  handle: (event: MouseEvent) => void,
): MouseEvent => {
  const anchor = document.createElement('a')
  for (const [name, value] of Object.entries(attrs)) anchor.setAttribute(name, value)
  document.body.appendChild(anchor)
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init })
  anchor.addEventListener('click', (clicked) => handle(clicked))
  // Stops jsdom's unimplemented page navigation for a click the rule left alone.
  window.addEventListener('click', (clicked) => clicked.preventDefault(), { once: true })
  anchor.dispatchEvent(event)
  anchor.remove()
  return event
}

describe('resolveLinkPath', () => {
  const origin = 'https://app.example'

  it.each(['/settings', '/search?q=a#top', 'relative/path', '#section', '?page=2'])(
    'returns the path %s unchanged',
    (to) => {
      expect(resolveLinkPath(to, origin)).toBe(to)
    },
  )

  it('turns a URL on the page origin into its path, query and hash', () => {
    expect(resolveLinkPath('https://app.example/docs/intro?v=2#setup', origin)).toBe(
      '/docs/intro?v=2#setup',
    )
    expect(resolveLinkPath('//app.example/docs', origin)).toBe('/docs')
  })

  it.each([
    'https://other.example/page',
    'http://app.example/page',
    'https://app.example:8443/page',
    '//cdn.example/file',
    'mailto:help@example.com',
    'tel:+15550100',
    'javascript:void(0)',
  ])('returns null for %s, which leaves the app', (to) => {
    expect(resolveLinkPath(to, origin)).toBeNull()
  })

  it('returns null for an absolute URL when there is no page origin', () => {
    expect(resolveLinkPath('https://app.example/docs', '')).toBeNull()
  })

  it('reads the current page origin by default', () => {
    expect(resolveLinkPath(`${window.location.origin}/here`)).toBe('/here')
  })
})

describe('routerLinkHref', () => {
  it('writes an app path as the router writes its own links', () => {
    const router = createMemoryRouter({ basePath: '/app' })
    expect(routerLinkHref('/settings?tab=billing#plan', router)).toBe(
      '/app/settings?tab=billing#plan',
    )
    expect(routerLinkHref('/', createMemoryRouter())).toBe('/')
  })

  it('keeps a URL as written', () => {
    const router = createMemoryRouter({ basePath: '/app' })
    for (const url of [
      'https://example.com/docs',
      'mailto:team@example.com',
      '//cdn.example.com/a.js',
      `${location.origin}/docs`,
    ])
      expect(routerLinkHref(url, router)).toBe(url)
  })
})

describe('isRouterLinkClick', () => {
  const judge = (init: MouseEventInit, attrs: Record<string, string> = {}): boolean => {
    let result = false
    clickAnchor(init, attrs, (event) => {
      result = isRouterLinkClick(event)
    })
    return result
  }

  it('accepts a plain primary click', () => {
    expect(judge({})).toBe(true)
  })

  it.each([
    ['ctrl', { ctrlKey: true }],
    ['meta', { metaKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['middle button', { button: 1 }],
    ['secondary button', { button: 2 }],
  ] as const)('refuses a %s click', (_label, init) => {
    expect(judge(init)).toBe(false)
  })

  it.each(['_blank', '_parent', '_top', 'preview'])(
    'refuses an anchor with target="%s"',
    (target) => {
      expect(judge({}, { target })).toBe(false)
    },
  )

  it('accepts target="_self" and an empty target', () => {
    expect(judge({}, { target: '_self' })).toBe(true)
    expect(judge({}, { target: '' })).toBe(true)
  })

  it('refuses a click an earlier handler prevented', () => {
    let result = true
    clickAnchor({}, {}, (event) => {
      event.preventDefault()
      result = isRouterLinkClick(event)
    })
    expect(result).toBe(false)
  })
})

describe('followRouterLink', () => {
  it('navigates in-app and prevents the page load for a plain click', () => {
    const router = createMemoryRouter({ initialEntries: ['/home', '/start'] })
    let took = false
    const event = clickAnchor({}, {}, (clicked) => {
      took = followRouterLink(clicked, '/settings', router)
    })
    expect(took).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(router.getLocation().pathname).toBe('/settings')
    router.back()
    expect(router.getLocation().pathname).toBe('/start')
  })

  it('leaves a modified click and an external URL alone', () => {
    const router = createMemoryRouter({ initialEntries: ['/start'] })
    let took = true
    clickAnchor({ ctrlKey: true }, {}, (clicked) => {
      took = followRouterLink(clicked, '/settings', router)
      expect(clicked.defaultPrevented).toBe(false)
    })
    expect(took).toBe(false)
    clickAnchor({}, {}, (clicked) => {
      took = followRouterLink(clicked, 'https://other.example/', router)
      expect(clicked.defaultPrevented).toBe(false)
    })
    expect(took).toBe(false)
    expect(router.getLocation().pathname).toBe('/start')
  })

  it('replaces for a link to the location shown, and passes replace and state through', () => {
    const router = createMemoryRouter({ initialEntries: ['/home', '/start?tab=a#top'] })
    clickAnchor({}, {}, (clicked) => followRouterLink(clicked, '/start?tab=a#top', router))
    router.back()
    expect(router.getLocation().pathname).toBe('/home')

    const pushed = createMemoryRouter({ initialEntries: ['/home', '/start'] })
    clickAnchor({}, {}, (clicked) =>
      followRouterLink(clicked, '/start', pushed, { replace: false, state: { from: 'x' } }),
    )
    expect(pushed.getLocation().state).toEqual({ from: 'x' })
    pushed.back()
    expect(pushed.getLocation().pathname).toBe('/start')
  })

  it('counterexample: a different query on the same path pushes', () => {
    const router = createMemoryRouter({ initialEntries: ['/home', '/start?tab=a'] })
    clickAnchor({}, {}, (clicked) => followRouterLink(clicked, '/start?tab=b', router))
    expect(router.getLocation().search).toBe('?tab=b')
    router.back()
    expect(router.getLocation().search).toBe('?tab=a')
  })
})
