// @vitest-environment jsdom
/**
 * Unit tests for the Vue `DetailHeader` — a port of
 * `@molecule/app-detail-header-react/src/__tests__/detail-header.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `page`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

import { createApp, defineComponent, h } from 'vue'

import { DetailHeader } from '../DetailHeader.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a `DetailHeader` and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(DetailHeader, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('DetailHeader', () => {
  it('renders the title inside an <h1>', () => {
    const markup = render({ title: 'Invoice #42' })
    expect(markup).toContain('<h1')
    expect(markup).toContain('Invoice #42')
  })

  it('renders the subtitle when present and omits it otherwise', () => {
    expect(render({ title: 'T', subtitle: 'due soon' })).toContain('due soon')
    expect(render({ title: 'T' })).not.toContain('<p')
  })

  it('renders the leading, status, search, and actions slots', () => {
    const markup = render({
      title: 'T',
      leading: h('span', { 'data-leading': '' }),
      status: h('span', { 'data-status': '' }),
      search: h('span', { 'data-search': '' }),
      actions: h('span', { 'data-actions': '' }),
    })
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-status=""')
    expect(markup).toContain('data-search=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the meta row when present and omits it otherwise', () => {
    const withMeta = render({ title: 'T', meta: h('span', { 'data-meta': '' }) })
    expect(withMeta).toContain('data-meta=""')
    expect(render({ title: 'T' })).not.toContain('data-meta')
  })

  it('applies the sticky inline style only when sticky is set', () => {
    expect(render({ title: 'T', sticky: true })).toContain('position: sticky')
    expect(render({ title: 'T' })).not.toContain('position: sticky')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render({ title: 'T', dataMolId: 'dh-x', className: 'dh-cls' })
    expect(markup).toContain('data-mol-id="dh-x"')
    expect(markup).toContain('dh-cls')
  })
})
