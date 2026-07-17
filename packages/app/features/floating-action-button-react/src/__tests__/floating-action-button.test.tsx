import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { FloatingActionButton } = await import('../FloatingActionButton.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)
const icon = createElement('span', { 'data-icon': '' })

describe('FloatingActionButton', () => {
  it('renders a <button> when onClick is supplied', () => {
    const markup = html(
      createElement(FloatingActionButton, { icon, label: 'Add', onClick: () => {} }),
    )
    expect(markup.startsWith('<button')).toBe(true)
    expect(markup).toContain('data-icon=""')
  })

  it('renders an <a> when href is supplied', () => {
    const markup = html(createElement(FloatingActionButton, { icon, label: 'Add', href: '/new' }))
    expect(markup.startsWith('<a')).toBe(true)
    expect(markup).toContain('href="/new"')
  })

  it('uses the label as the aria-label', () => {
    const markup = html(
      createElement(FloatingActionButton, { icon, label: 'New item', onClick: () => {} }),
    )
    expect(markup).toContain('aria-label="New item"')
  })

  it('renders the tooltip title by default and drops it when showTooltip is false', () => {
    const withTip = html(
      createElement(FloatingActionButton, { icon, label: 'Add', onClick: () => {} }),
    )
    expect(withTip).toContain('title="Add"')
    const without = html(
      createElement(FloatingActionButton, {
        icon,
        label: 'Add',
        onClick: () => {},
        showTooltip: false,
      }),
    )
    expect(without).not.toContain('title=')
  })

  it('anchors to the requested screen corner via inline style', () => {
    const markup = html(
      createElement(FloatingActionButton, {
        icon,
        label: 'Add',
        onClick: () => {},
        position: 'top-left',
      }),
    )
    expect(markup).toContain('position:fixed')
    expect(markup).toContain('left:24px')
    expect(markup).toContain('top:24px')
  })

  it('sizes the button from the size preset', () => {
    const markup = html(
      createElement(FloatingActionButton, { icon, label: 'Add', onClick: () => {}, size: 'lg' }),
    )
    // lg → 16 * 4 = 64px
    expect(markup).toContain('width:64px')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(FloatingActionButton, {
        icon,
        label: 'Add',
        onClick: () => {},
        className: 'fab-cls',
      }),
    )
    expect(markup).toContain('fab-cls')
  })

  it('applies a visible default surface (background + elevation) out of the box', () => {
    const markup = html(
      createElement(FloatingActionButton, { icon, label: 'Add', onClick: () => {} }),
    )
    const cls = markup.match(/class="([^"]*)"/)?.[1] ?? ''
    // A FAB is a prominent primary action — its default surface must not be
    // empty (the pre-fix bug: a transparent, invisible circle).
    expect(cls.length).toBeGreaterThan(0)
    // The default pulls a real ClassMap surface/background token
    // (`gradientPrimary` — a primary gradient with contrasting on-primary
    // icon color) plus an elevation token (`shadowLifted`), with no caller
    // styling supplied.
    expect(cls).toContain('gradientPrimary')
    expect(cls).toContain('shadowLifted')
  })

  it('lets an explicit className override/compose over the default surface', () => {
    const markup = html(
      createElement(FloatingActionButton, {
        icon,
        label: 'Add',
        onClick: () => {},
        className: 'fab-override',
      }),
    )
    const cls = markup.match(/class="([^"]*)"/)?.[1] ?? ''
    // Caller class composes in…
    expect(cls).toContain('fab-override')
    // …and is emitted AFTER the default surface token, so under cm.cn's real
    // tailwind-merge a conflicting caller class wins (default is overridable).
    expect(cls.indexOf('fab-override')).toBeGreaterThan(cls.indexOf('gradientPrimary'))
  })
})
