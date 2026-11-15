// @vitest-environment jsdom
/**
 * Unit tests for the Vue `HelpButton` — a port of
 * `@molecule/app-help-button-react/src/__tests__/help-button.test.tsx`: the
 * same behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

// A ClassMap proxy echoing each accessed member back as its token, so tests
// can assert which cm.* class was applied without a real bond — the same mock
// the React tests use.
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

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { HelpButton } = await import('../HelpButton.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders a {@link HelpButton} and returns the markup it produced.
 *
 * @param props - The component props.
 * @param slots - Named slots (the default slot is unused).
 * @returns The rendered markup.
 */
const render = (props: Record<string, unknown>, slots?: Record<string, () => VNodeChild[]>) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(HelpButton, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('HelpButton', () => {
  it('renders a <button> when no href is supplied', () => {
    const markup = render({ onClick: () => {} })
    expect(markup.startsWith('<button')).toBe(true)
  })

  it('renders an <a> when href is supplied', () => {
    const markup = render({ href: '/support' })
    expect(markup.startsWith('<a')).toBe(true)
    expect(markup).toContain('href="/support"')
  })

  it('renders the default "?" glyph and a custom icon override', () => {
    expect(render({})).toContain('?')
    const custom = render({ icon: h('span', { 'data-icon': '' }) })
    expect(custom).toContain('data-icon=""')
  })

  it('uses the default "Help" aria-label and a custom label', () => {
    expect(render({})).toContain('aria-label="Help"')
    expect(render({ label: 'Get support' })).toContain('aria-label="Get support"')
  })

  it('renders the notification dot only when hasNotification is set', () => {
    // the dot is a small absolute-positioned span with a border-radius
    const withDot = render({ hasNotification: true })
    expect(withDot).toMatch(/border-radius:\s*50%/)
    const without = render({})
    expect(without).not.toMatch(/border-radius:\s*50%/)
  })

  it('uses fixed positioning for a corner position and drops it for inline', () => {
    expect(render({ position: 'bottom-right' })).toMatch(/position:\s*fixed/)
    expect(render({ position: 'inline' })).not.toMatch(/position:\s*fixed/)
  })

  it('forwards className', () => {
    const markup = render({ className: 'hb-cls' })
    expect(markup).toContain('hb-cls')
  })
})
