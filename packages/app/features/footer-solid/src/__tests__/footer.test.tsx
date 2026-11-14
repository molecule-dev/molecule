// @vitest-environment jsdom
import type { JSX } from 'solid-js'
import { Show } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMemoryRouter } from '@molecule/app-routing'
import type * as SolidBinding from '@molecule/app-solid'

import type { AppFooterProps } from '../types.js'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `footerBar`), so tests can assert which cm.* call was applied without a
// real bond — the same mock the React package's own tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The internal links are the binding's real `Link`, over the real router context.
vi.mock('@molecule/app-solid', async (importOriginal) => {
  const actual = await importOriginal<typeof SolidBinding>()
  return {
    Link: actual.Link,
    RouterContext: actual.RouterContext,
    useTranslation: () => ({
      t: (
        _key: string,
        values: Record<string, unknown> | undefined,
        opts?: { defaultValue?: string },
      ) => {
        let out = opts?.defaultValue ?? _key
        if (values)
          for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
        return out
      },
      locale: () => 'en',
      setLocale: () => Promise.resolve(),
      locales: () => [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Español' },
      ],
    }),
    useVersion: () => ({ state: () => ({ version: '2.0.0' }) }),
  }
})

vi.mock('@molecule/app-ui-solid', () => ({
  Icon: (props: { name?: string }) => <span data-icon={props.name} />,
  // Render children only when open, like the real Modal — so a closed modal
  // has no body and an opened one exposes exactly what the footer put inside
  // it.
  Modal: (props: { open: boolean; children?: JSX.Element }) => (
    <Show when={props.open}>
      <div data-modal="">{props.children}</div>
    </Show>
  ),
}))

const { AppFooter } = await import('../AppFooter.js')
const { RouterContext } = await import('@molecule/app-solid')

const disposers: Array<() => void> = []

/** The router every mount sits inside (a wired app always has one). */
let router = createMemoryRouter({ initialEntries: ['/'] })

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  router = createMemoryRouter({ initialEntries: ['/'] })
})

/** Render with Solid's browser renderer, inside the router, and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => <RouterContext.Provider value={router}>{view()}</RouterContext.Provider>,
      container,
    ),
  )
  return container
}

/** The rendered footer's HTML. */
const footerHtml = (props: AppFooterProps): string =>
  mount(() => <AppFooter {...props} />).innerHTML

describe('AppFooter', () => {
  it('renders the About link with the interpolated app name', () => {
    expect(footerHtml({ appName: 'Acme', aboutHref: '/about' })).toContain('About Acme')
  })

  it('renders an external About href as a target=_blank anchor', () => {
    const html = footerHtml({ appName: 'Acme', aboutHref: 'https://acme.com' })
    expect(html).toContain('href="https://acme.com"')
    expect(html).toContain('target="_blank"')
  })

  it('renders an internal About href as a router Link', () => {
    const html = footerHtml({ appName: 'Acme', aboutHref: '/about' })
    expect(html).toContain('href="/about"')
    // It went through the binding's Link, not the external-anchor branch
    // (React's test proves the same with its mock Link's `data-link=""`).
    expect(html).not.toContain('target="_blank"')
    // The anchor navigates in-app instead of the browser default reload.
    const container = mount(() => <AppFooter appName="Acme" aboutHref="/about" />)
    container.querySelector('a')?.click()
    expect(router.getLocation().pathname).toBe('/about')
  })

  it('renders Privacy/Terms as buttons in modal mode', () => {
    const container = mount(() => <AppFooter appName="Acme" aboutHref="/about" />)
    expect(container.innerHTML).toContain('Privacy Policy')
    expect(container.innerHTML).toContain('Terms of Service')
    // Each label renders as a real <button> element (not a link) whose only
    // content is the label text. (React's own test asserts this with a
    // `/<button[^>]*>Privacy Policy/` markup regex; the equivalent DOM check
    // keeps the assertion independent of the mock ClassMap's token shapes.)
    const buttons = Array.from(container.querySelectorAll('footer button'))
    const privacy = buttons.find((b) => b.textContent === 'Privacy Policy')
    const terms = buttons.find((b) => b.textContent === 'Terms of Service')
    expect(privacy?.getAttribute('type')).toBe('button')
    expect(terms?.getAttribute('type')).toBe('button')
  })

  it('renders Privacy/Terms as router Links in route mode', () => {
    const html = footerHtml({ appName: 'Acme', aboutHref: '/about', legalMode: 'route' })
    expect(html).toContain('href="/privacy"')
    expect(html).toContain('href="/terms"')
  })

  it('renders the language button and the version string', () => {
    const html = footerHtml({ appName: 'Acme', aboutHref: '/about' })
    expect(html).toContain('data-icon="globe"')
    expect(html).toContain('English')
    expect(html).toContain('v2.0.0')
  })

  it('keeps the privacy/terms modals closed initially', () => {
    expect(footerHtml({ appName: 'Acme', aboutHref: '/about' })).not.toContain('data-modal=""')
  })

  it('sets data-mol-id and forwards className', () => {
    const html = footerHtml({
      appName: 'Acme',
      aboutHref: '/about',
      dataMolId: 'footer-x',
      className: 'ft-cls',
    })
    expect(html).toContain('data-mol-id="footer-x"')
    expect(html).toContain('ft-cls')
  })
})
