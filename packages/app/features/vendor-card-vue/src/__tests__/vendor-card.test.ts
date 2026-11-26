// @vitest-environment jsdom
/**
 * Unit tests for the Vue `VendorCard` — a port of
 * `@molecule/app-vendor-card-react/src/__tests__/vendor-card.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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

vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Avatar: defineComponent({
      props: {
        src: { type: String, default: undefined },
        name: { type: String, default: undefined },
      },
      setup(props) {
        return () =>
          h('img', { 'data-avatar': props.src ?? '', 'data-avatar-name': props.name ?? '' })
      },
    }),
    Card: defineComponent({
      props: { className: { type: String, default: undefined } },
      setup(props, { slots }) {
        return () => h('div', { 'data-card': '', class: props.className }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

const { VendorCard } = await import('../VendorCard.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link VendorCard} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(VendorCard, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('VendorCard', () => {
  it('renders the name in an <h3> and the avatar', () => {
    const markup = render({ name: 'Acme Supplies' })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Acme Supplies')
    expect(markup).toContain('data-avatar-name="Acme Supplies"')
  })

  it('renders the description when present', () => {
    const markup = render({ name: 'V', description: 'Trusted parts seller' })
    expect(markup).toContain('Trusted parts seller')
  })

  it('renders the rating (1 decimal) and review count when present', () => {
    const markup = render({ name: 'V', rating: 4.7, reviewCount: 312 })
    expect(markup).toContain('4.7')
    expect(markup).toContain('(312)')
  })

  it('renders the memberSince line', () => {
    const markup = render({ name: 'V', memberSince: 'since 2019' })
    expect(markup).toContain('since 2019')
  })

  it('renders the badges and actions slots', () => {
    const markup = render(
      { name: 'V' },
      {
        badges: () => [h('span', { 'data-badges': '' })],
        actions: () => [h('button', { 'data-actions': '' })],
      },
    )
    expect(markup).toContain('data-badges=""')
    expect(markup).toContain('data-actions=""')
  })

  it('forwards className onto the Card', () => {
    const markup = render({ name: 'V', className: 'vc-cls' })
    expect(markup).toContain('vc-cls')
  })
})
