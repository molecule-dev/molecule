// @vitest-environment jsdom
/**
 * Unit tests for the Solid `VendorCard` — a port of
 * `@molecule/app-vendor-card-react/src/__tests__/vendor-card.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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

import type { JSX } from 'solid-js'

vi.mock('@molecule/app-ui-solid', async () => {
  const { insert } = await import('solid-js/web')
  return {
    // The same stubs the React tests install for `@molecule/app-ui-react`:
    // an `<img data-avatar data-avatar-name>` and a `<div data-card>` wrapper.
    Avatar: (props: { src?: string; name?: string }) => {
      const img = document.createElement('img')
      img.setAttribute('data-avatar', props.src ?? '')
      img.setAttribute('data-avatar-name', props.name ?? '')
      return img
    },
    Card: (props: { className?: string; children?: JSX.Element }) => {
      const div = document.createElement('div')
      div.setAttribute('data-card', '')
      if (props.className) div.className = props.className
      insert(div, props.children)
      return div
    },
  }
})

const { VendorCard } = await import('../VendorCard.jsx')

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

describe('VendorCard', () => {
  it('renders the name in an <h3> and the avatar', () => {
    const container = mount(() => <VendorCard name="Acme Supplies" />)
    const markup = container.innerHTML
    expect(markup).toContain('<h3')
    expect(markup).toContain('Acme Supplies')
    expect(markup).toContain('data-avatar-name="Acme Supplies"')
  })

  it('renders the description when present', () => {
    const container = mount(() => <VendorCard name="V" description="Trusted parts seller" />)
    expect(container.innerHTML).toContain('Trusted parts seller')
  })

  it('renders the rating (1 decimal) and review count when present', () => {
    const container = mount(() => <VendorCard name="V" rating={4.7} reviewCount={312} />)
    const markup = container.innerHTML
    expect(markup).toContain('4.7')
    expect(markup).toContain('(312)')
  })

  it('renders the memberSince line', () => {
    const container = mount(() => <VendorCard name="V" memberSince="since 2019" />)
    expect(container.innerHTML).toContain('since 2019')
  })

  it('renders the badges and actions slots', () => {
    const container = mount(() => (
      <VendorCard name="V" badges={<span data-badges />} actions={<button data-actions />} />
    ))
    const markup = container.innerHTML
    expect(markup).toContain('data-badges=""')
    expect(markup).toContain('data-actions=""')
  })

  it('forwards className onto the Card', () => {
    const container = mount(() => <VendorCard name="V" className="vc-cls" />)
    expect(container.innerHTML).toContain('vc-cls')
  })
})
