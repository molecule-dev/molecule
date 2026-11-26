// @vitest-environment jsdom
/**
 * Unit tests for the Vue `SectionDivider` — a port of
 * `@molecule/app-section-divider-react/src/__tests__/section-divider.test.tsx`:
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { SectionDivider } from '../SectionDivider.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link SectionDivider} and returns the markup it produced. */
const render = (props: Record<string, unknown>, defaultSlot?: () => VNodeChild[]): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: () => h(SectionDivider, props, defaultSlot ? { default: defaultSlot } : {}),
    }),
  )
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('SectionDivider', () => {
  it('exposes a horizontal separator role', () => {
    const markup = render({})
    expect(markup).toContain('role="separator"')
    expect(markup).toContain('aria-orientation="horizontal"')
  })

  it('renders the label children when present', () => {
    const markup = render({}, () => ['OR'])
    expect(markup).toContain('OR')
  })

  // jsdom canonicalizes every style written through the CSSOM (Vue's object
  // style path) to `border-top: 1px solid` — React's own suite counts
  // occurrences of the same declaration in React's serialized form.
  it('renders flanking lines on both sides for center alignment', () => {
    const markup = render({ align: 'center' }, () => ['OR'])
    expect(markup.split('border-top: 1px solid').length - 1).toBe(2)
  })

  it('renders a single flanking line for start alignment', () => {
    const markup = render({ align: 'start' }, () => ['Today'])
    expect(markup.split('border-top: 1px solid').length - 1).toBe(1)
  })

  it('renders a single flanking line for end alignment', () => {
    const markup = render({ align: 'end' }, () => ['Today'])
    expect(markup.split('border-top: 1px solid').length - 1).toBe(1)
  })

  it('forwards className', () => {
    const markup = render({ className: 'sd-cls' })
    expect(markup).toContain('sd-cls')
  })
})
