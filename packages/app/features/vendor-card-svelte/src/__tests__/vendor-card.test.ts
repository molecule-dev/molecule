// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `VendorCard` — a port of
 * `@molecule/app-vendor-card-react/src/__tests__/vendor-card.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and
 * asserted on the markup the component produces.
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

vi.mock('@molecule/app-ui-svelte', async (importOriginal) => {
  const { default: Avatar } = await import('./stubs/AvatarStub.svelte')
  const { default: Card } = await import('./stubs/CardStub.svelte')
  return { ...(await importOriginal<Record<string, unknown>>()), Avatar, Card }
})

import { type ComponentProps, mount, unmount } from 'svelte'

const { VendorCard } = await import('../components.js')
const { default: SlotsHost } = await import('./SlotsHost.svelte')

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link VendorCard} and returns the markup it produced. */
const render = (props: ComponentProps<typeof VendorCard>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(VendorCard, { target, props })
  const markup = target.innerHTML
  void unmount(component)
  target.remove()
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
    const target = document.createElement('div')
    document.body.appendChild(target)
    const component = mount(SlotsHost, { target })
    const markup = target.innerHTML
    void unmount(component)
    expect(markup).toContain('data-badges=""')
    expect(markup).toContain('data-actions=""')
  })

  it('forwards className onto the Card', () => {
    const markup = render({ name: 'V', className: 'vc-cls' })
    expect(markup).toContain('vc-cls')
  })
})
