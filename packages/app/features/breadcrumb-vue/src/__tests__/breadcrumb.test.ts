// @vitest-environment jsdom
/**
 * Unit tests for the Vue `Breadcrumb` — a port of
 * `@molecule/app-breadcrumb-react/src/__tests__/breadcrumb.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `link`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

const { Breadcrumb } = await import('../Breadcrumb.js')

import { createApp, defineComponent, h } from 'vue'

/** Renders a {@link Breadcrumb} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(Breadcrumb, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const items = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Alpha' },
]

describe('Breadcrumb', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders every crumb label', () => {
    const markup = render({ items })
    expect(markup).toContain('Home')
    expect(markup).toContain('Projects')
    expect(markup).toContain('Alpha')
  })

  it('marks the last crumb as the current page', () => {
    const markup = render({ items })
    expect(markup).toContain('aria-current="page"')
  })

  it('renders linked crumbs as anchors when no onNavigate is supplied', () => {
    const markup = render({ items })
    expect(markup).toContain('href="/"')
    expect(markup).toContain('href="/projects"')
  })

  it('renders linked crumbs as buttons when onNavigate is supplied', () => {
    const markup = render({ items, onNavigate: () => {} })
    expect(markup).toContain('<button')
    expect(markup).not.toContain('href="/projects"')
  })

  it('renders a crumb without `to` as plain text', () => {
    const markup = render({ items: [{ label: 'Just text' }] })
    expect(markup).toContain('Just text')
    expect(markup).not.toContain('href')
    expect(markup).not.toContain('<button')
  })

  it('renders the default "/" separator between crumbs', () => {
    const markup = render({ items })
    // two separators for three items
    expect(markup.split('aria-hidden="true">/').length - 1).toBe(2)
  })

  it('renders a custom separator node', () => {
    const markup = render({ items, separator: h('span', { 'data-sep': '' }, '>') })
    expect(markup).toContain('data-sep=""')
  })

  it('renders crumb icons', () => {
    const markup = render({
      items: [{ label: 'Home', to: '/', icon: h('i', { 'data-icon': '' }) }],
    })
    expect(markup).toContain('data-icon=""')
  })

  it('labels the nav region "Breadcrumb", sets data-mol-id, and forwards className', () => {
    const markup = render({ items, dataMolId: 'bc-x', className: 'bc-cls' })
    expect(markup).toContain('aria-label="Breadcrumb"')
    expect(markup).toContain('data-mol-id="bc-x"')
    expect(markup).toContain('bc-cls')
  })
})
