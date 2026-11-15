// @vitest-environment jsdom
/**
 * Unit tests for the Vue `FloatingActionButton` — a port of
 * `@molecule/app-floating-action-button-react/src/__tests__/floating-action-button.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'

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

const { FloatingActionButton } = await import('../FloatingActionButton.js')

/**
 * Renders a {@link FloatingActionButton} and returns the markup it produced.
 *
 * @param props - The component props.
 * @returns The rendered markup.
 */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(FloatingActionButton, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const icon = h('span', { 'data-icon': '' })

afterEach(() => {
  document.body.innerHTML = ''
})

describe('FloatingActionButton', () => {
  it('renders a <button> when onClick is supplied', () => {
    const markup = render({ icon, label: 'Add', onClick: () => {} })
    expect(markup.startsWith('<button')).toBe(true)
    expect(markup).toContain('data-icon=""')
  })

  it('renders an <a> when href is supplied', () => {
    const markup = render({ icon, label: 'Add', href: '/new' })
    expect(markup.startsWith('<a')).toBe(true)
    expect(markup).toContain('href="/new"')
  })

  it('uses the label as the aria-label', () => {
    const markup = render({ icon, label: 'New item', onClick: () => {} })
    expect(markup).toContain('aria-label="New item"')
  })

  it('renders the tooltip title by default and drops it when showTooltip is false', () => {
    const withTip = render({ icon, label: 'Add', onClick: () => {} })
    expect(withTip).toContain('title="Add"')
    const without = render({ icon, label: 'Add', onClick: () => {}, showTooltip: false })
    expect(without).not.toContain('title=')
  })

  it('anchors to the requested screen corner via inline style', () => {
    const markup = render({ icon, label: 'Add', onClick: () => {}, position: 'top-left' })
    expect(markup).toMatch(/position:\s*fixed/)
    expect(markup).toMatch(/left:\s*24px/)
    expect(markup).toMatch(/top:\s*24px/)
  })

  it('sizes the button from the size preset', () => {
    const markup = render({ icon, label: 'Add', onClick: () => {}, size: 'lg' })
    // lg → 16 * 4 = 64px
    expect(markup).toMatch(/width:\s*64px/)
  })

  it('forwards className', () => {
    const markup = render({ icon, label: 'Add', onClick: () => {}, className: 'fab-cls' })
    expect(markup).toContain('fab-cls')
  })

  it('applies a visible default surface (background + elevation) out of the box', () => {
    const markup = render({ icon, label: 'Add', onClick: () => {} })
    const cls = markup.match(/class="([^"]*)"/)?.[1] ?? ''
    // A FAB is a prominent primary action — its default surface must not be
    // empty (the pre-fix bug: a transparent, invisible circle).
    expect(cls.length).toBeGreaterThan(0)
    expect(cls).toContain('gradientPrimary')
    expect(cls).toContain('shadowLifted')
  })

  it('lets an explicit className override/compose over the default surface', () => {
    const markup = render({ icon, label: 'Add', onClick: () => {}, className: 'fab-override' })
    const cls = markup.match(/class="([^"]*)"/)?.[1] ?? ''
    // Caller class composes in…
    expect(cls).toContain('fab-override')
    // …and is emitted AFTER the default surface token, so under cm.cn's real
    // tailwind-merge a conflicting caller class wins (default is overridable).
    expect(cls.indexOf('fab-override')).toBeGreaterThan(cls.indexOf('gradientPrimary'))
  })
})
