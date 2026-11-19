// @vitest-environment jsdom
/**
 * Unit tests for the Vue `AddressDisplay` — a port of
 * `@molecule/app-address-display-react/src/__tests__/address-display.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex1`), so tests can assert which cm.* class was applied without a real
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

import { createApp, defineComponent, h } from 'vue'

import { AddressDisplay } from '../AddressDisplay.js'
import type { AddressDisplayProps } from '../types.js'

const address = {
  line1: '123 Main St',
  line2: 'Suite 4',
  city: 'Springfield',
  state: 'IL',
  postalCode: '62704',
  country: 'USA',
}

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders an {@link AddressDisplay} and returns the markup it produced. */
const render = (props: AddressDisplayProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(AddressDisplay, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('AddressDisplay', () => {
  it('renders the formatted address lines', () => {
    const markup = render({ address })
    expect(markup).toContain('123 Main St')
    expect(markup).toContain('Suite 4')
    expect(markup).toContain('Springfield, IL 62704')
    expect(markup).toContain('USA')
  })

  it('renders multi-line mode inside an <address> element by default', () => {
    const markup = render({ address })
    expect(markup).toContain('<address')
  })

  it('joins all fields on one line in inline mode', () => {
    const markup = render({ address, inline: true })
    expect(markup).toContain('123 Main St, Suite 4, Springfield, IL 62704, USA')
    expect(markup).not.toContain('<address')
  })

  it('renders the name when present and omits it otherwise', () => {
    expect(render({ address, name: 'Acme HQ' })).toContain('Acme HQ')
  })

  it('renders the phone as a tel: link', () => {
    const markup = render({ address, phone: '+15551234' })
    expect(markup).toContain('href="tel:+15551234"')
    expect(markup).toContain('+15551234')
  })

  it('renders the leading and actions slots', () => {
    const markup = render({
      address,
      leading: h('span', { 'data-leading': '' }),
      actions: h('span', { 'data-actions': '' }),
    })
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-actions=""')
  })

  it('forwards className', () => {
    const markup = render({ address, className: 'ad-cls' })
    expect(markup).toContain('ad-cls')
  })
})
