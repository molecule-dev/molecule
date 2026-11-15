// @vitest-environment jsdom
/**
 * Unit tests for the Solid `DetailPageLayout` — a port of
 * `@molecule/app-detail-page-layout-react/src/__tests__/detail-page-layout.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* call was applied without a real bond — the
// same mock the React package's own tests use.
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

import type { JSX } from 'solid-js'

const { DetailPageLayout } = await import('../DetailPageLayout.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('DetailPageLayout', () => {
  it('renders the main content', () => {
    const container = mount(() => <DetailPageLayout main={<div data-main="" />} />)
    expect(container.innerHTML).toContain('data-main=""')
  })

  it('renders the breadcrumb and topBar slots when present', () => {
    const container = mount(() => (
      <DetailPageLayout
        main="x"
        breadcrumb={<nav data-crumb="" />}
        topBar={<div data-topbar="" />}
      />
    ))
    expect(container.innerHTML).toContain('data-crumb=""')
    expect(container.innerHTML).toContain('data-topbar=""')
  })

  it('renders the sidebar after the main column by default (right)', () => {
    const container = mount(() => (
      <DetailPageLayout main={<div data-main="" />} sidebar={<div data-sidebar="" />} />
    ))
    expect(container.innerHTML).toContain('<aside')
    expect(container.innerHTML.indexOf('data-main')).toBeLessThan(
      container.innerHTML.indexOf('data-sidebar'),
    )
  })

  it('renders the sidebar before the main column when sidebarPosition is left', () => {
    const container = mount(() => (
      <DetailPageLayout
        main={<div data-main="" />}
        sidebar={<div data-sidebar="" />}
        sidebarPosition="left"
      />
    ))
    expect(container.innerHTML.indexOf('data-sidebar')).toBeLessThan(
      container.innerHTML.indexOf('data-main'),
    )
  })

  it('renders no <aside> when no sidebar is supplied', () => {
    const container = mount(() => <DetailPageLayout main="x" />)
    expect(container.innerHTML).not.toContain('<aside')
  })

  it('applies the sidebarWidth as a flex-basis on the aside', () => {
    const container = mount(() => <DetailPageLayout main="x" sidebar="y" sidebarWidth="lg" />)
    // lg → 96 * 4 = 384px
    expect(container.innerHTML).toContain('flex-basis: 384px')
  })

  it('sets data-mol-id and forwards className', () => {
    const container = mount(() => (
      <DetailPageLayout main="x" dataMolId="dpl-x" className="dpl-cls" />
    ))
    expect(container.innerHTML).toContain('data-mol-id="dpl-x"')
    expect(container.innerHTML).toContain('dpl-cls')
  })
})
