// @vitest-environment jsdom
/**
 * Unit tests for the Vue `DetailPageLayout` — a port of
 * `@molecule/app-detail-page-layout-react/src/__tests__/detail-page-layout.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { DetailPageLayout } from '../DetailPageLayout.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link DetailPageLayout} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(DetailPageLayout, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('DetailPageLayout', () => {
  it('renders the main content', () => {
    const markup = render({}, { main: () => [h('div', { 'data-main': '' })] })
    expect(markup).toContain('data-main=""')
  })

  it('renders the breadcrumb and topBar slots when present', () => {
    const markup = render(
      {},
      {
        main: () => ['x'],
        breadcrumb: () => [h('nav', { 'data-crumb': '' })],
        topBar: () => [h('div', { 'data-topbar': '' })],
      },
    )
    expect(markup).toContain('data-crumb=""')
    expect(markup).toContain('data-topbar=""')
  })

  it('renders the sidebar after the main column by default (right)', () => {
    const markup = render(
      {},
      {
        main: () => [h('div', { 'data-main': '' })],
        sidebar: () => [h('div', { 'data-sidebar': '' })],
      },
    )
    expect(markup).toContain('<aside')
    expect(markup.indexOf('data-main')).toBeLessThan(markup.indexOf('data-sidebar'))
  })

  it('renders the sidebar before the main column when sidebarPosition is left', () => {
    const markup = render(
      { sidebarPosition: 'left' },
      {
        main: () => [h('div', { 'data-main': '' })],
        sidebar: () => [h('div', { 'data-sidebar': '' })],
      },
    )
    expect(markup.indexOf('data-sidebar')).toBeLessThan(markup.indexOf('data-main'))
  })

  it('renders no <aside> when no sidebar is supplied', () => {
    const markup = render({}, { main: () => ['x'] })
    expect(markup).not.toContain('<aside')
  })

  it('applies the sidebarWidth as a flex-basis on the aside', () => {
    const markup = render({ sidebarWidth: 'lg' }, { main: () => ['x'], sidebar: () => ['y'] })
    // lg → 96 * 4 = 384px
    expect(markup).toContain('flex-basis: 384px')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render({ dataMolId: 'dpl-x', className: 'dpl-cls' }, { main: () => ['x'] })
    expect(markup).toContain('data-mol-id="dpl-x"')
    expect(markup).toContain('dpl-cls')
  })
})
