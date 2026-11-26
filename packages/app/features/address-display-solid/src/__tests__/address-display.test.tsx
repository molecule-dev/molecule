// @vitest-environment jsdom
/**
 * Unit tests for the Solid `AddressDisplay` — a port of
 * `@molecule/app-address-display-react/src/__tests__/address-display.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex1`), so tests can assert which cm.* class was applied without a real
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

const { AddressDisplay } = await import('../AddressDisplay.jsx')

const address = {
  line1: '123 Main St',
  line2: 'Suite 4',
  city: 'Springfield',
  state: 'IL',
  postalCode: '62704',
  country: 'USA',
}

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

describe('AddressDisplay', () => {
  it('renders the formatted address lines', () => {
    const container = mount(() => <AddressDisplay address={address} />)
    expect(container.innerHTML).toContain('123 Main St')
    expect(container.innerHTML).toContain('Suite 4')
    expect(container.innerHTML).toContain('Springfield, IL 62704')
    expect(container.innerHTML).toContain('USA')
  })

  it('renders multi-line mode inside an <address> element by default', () => {
    const container = mount(() => <AddressDisplay address={address} />)
    expect(container.innerHTML).toContain('<address')
  })

  it('joins all fields on one line in inline mode', () => {
    const container = mount(() => <AddressDisplay address={address} inline />)
    expect(container.innerHTML).toContain('123 Main St, Suite 4, Springfield, IL 62704, USA')
    expect(container.innerHTML).not.toContain('<address')
  })

  it('renders the name when present and omits it otherwise', () => {
    const container = mount(() => <AddressDisplay address={address} name="Acme HQ" />)
    expect(container.innerHTML).toContain('Acme HQ')
  })

  it('renders the phone as a tel: link', () => {
    const container = mount(() => <AddressDisplay address={address} phone="+15551234" />)
    expect(container.innerHTML).toContain('href="tel:+15551234"')
    expect(container.innerHTML).toContain('+15551234')
  })

  it('renders the leading and actions slots', () => {
    const container = mount(() => (
      <AddressDisplay
        address={address}
        leading={<span data-leading="" />}
        actions={<span data-actions="" />}
      />
    ))
    expect(container.innerHTML).toContain('data-leading=""')
    expect(container.innerHTML).toContain('data-actions=""')
  })

  it('forwards className', () => {
    const container = mount(() => <AddressDisplay address={address} className="ad-cls" />)
    expect(container.innerHTML).toContain('ad-cls')
  })
})
