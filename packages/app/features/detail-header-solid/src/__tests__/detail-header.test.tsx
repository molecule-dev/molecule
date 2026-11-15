// @vitest-environment jsdom
/**
 * Unit tests for the Solid `DetailHeader` — a port of
 * `@molecule/app-detail-header-react/src/__tests__/detail-header.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `page`),
// so tests can assert which cm.* class was applied without a real bond — the
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

const { DetailHeader } = await import('../DetailHeader.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and return the wrapper element. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('DetailHeader', () => {
  it('renders the title inside an <h1>', () => {
    const container = mount(() => <DetailHeader title="Invoice #42" />)
    expect(container.innerHTML).toContain('<h1')
    expect(container.innerHTML).toContain('Invoice #42')
  })

  it('renders the subtitle when present and omits it otherwise', () => {
    expect(mount(() => <DetailHeader title="T" subtitle="due soon" />).innerHTML).toContain(
      'due soon',
    )
    expect(mount(() => <DetailHeader title="T" />).innerHTML).not.toContain('<p')
  })

  it('renders the leading, status, search, and actions slots', () => {
    const container = mount(() => (
      <DetailHeader
        title="T"
        leading={<span data-leading="" />}
        status={<span data-status="" />}
        search={<span data-search="" />}
        actions={<span data-actions="" />}
      />
    ))
    expect(container.innerHTML).toContain('data-leading=""')
    expect(container.innerHTML).toContain('data-status=""')
    expect(container.innerHTML).toContain('data-search=""')
    expect(container.innerHTML).toContain('data-actions=""')
  })

  it('renders the meta row when present and omits it otherwise', () => {
    const withMeta = mount(() => <DetailHeader title="T" meta={<span data-meta="" />} />)
    expect(withMeta.innerHTML).toContain('data-meta=""')
    expect(mount(() => <DetailHeader title="T" />).innerHTML).not.toContain('data-meta')
  })

  it('applies the sticky inline style only when sticky is set', () => {
    expect(mount(() => <DetailHeader title="T" sticky />).innerHTML).toContain('position: sticky')
    expect(mount(() => <DetailHeader title="T" />).innerHTML).not.toContain('position: sticky')
  })

  it('sets data-mol-id and forwards className', () => {
    const container = mount(() => <DetailHeader title="T" dataMolId="dh-x" className="dh-cls" />)
    expect(container.innerHTML).toContain('data-mol-id="dh-x"')
    expect(container.innerHTML).toContain('dh-cls')
  })
})
