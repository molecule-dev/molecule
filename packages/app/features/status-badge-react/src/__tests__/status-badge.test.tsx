import type { ReactNode } from 'react'
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
        // Mirror the real `@molecule/app-ui-tailwind` badge resolver: a
        // `variant` maps to a real `bg-<color>` theme utility (never a
        // nonexistent `bg-*-container` token).
        if (prop === 'badge') {
          return (opts?: { variant?: string }) => `badge bg-${opts?.variant ?? 'default'}`
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-ui-react', () => ({
  Badge: ({
    children,
    color,
    className,
  }: {
    children?: ReactNode
    color?: string
    className?: string
  }) => createElement('span', { 'data-badge': '', 'data-color': color, className }, children),
}))

const { StatusBadge } = await import('../StatusBadge.js')
const { StatusPill } = await import('../StatusPill.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('StatusBadge', () => {
  it('renders the ui-appearance Badge by default with the kind-mapped color', () => {
    const markup = html(createElement(StatusBadge, { kind: 'success', children: 'Open' }))
    expect(markup).toContain('data-badge=""')
    expect(markup).toContain('data-color="success"')
    expect(markup).toContain('Open')
  })

  it('maps the neutral kind to the secondary Badge color', () => {
    const markup = html(createElement(StatusBadge, { kind: 'neutral', children: 'Archived' }))
    expect(markup).toContain('data-color="secondary"')
  })

  it('renders a plain <span> pill (no Badge) for the uppercase-pill appearance', () => {
    const markup = html(
      createElement(StatusBadge, {
        kind: 'error',
        appearance: 'uppercase-pill',
        children: 'Failed',
      }),
    )
    expect(markup).not.toContain('data-badge')
    expect(markup).toContain('uppercase')
    expect(markup).toContain('Failed')
  })

  // Regression for finding L116: the pill used `bg-*-container` tokens that
  // exist in no theme, so it rendered colorless. Every kind must now color
  // through a real ClassMap `badge` token (never a `bg-*-container`).
  it.each([
    ['success', 'bg-success'],
    ['warning', 'bg-warning'],
    ['error', 'bg-error'],
    ['info', 'bg-info'],
    ['neutral', 'bg-secondary'],
  ] as const)('colors the %s uppercase-pill with a real theme token', (kind, colorToken) => {
    const markup = html(
      createElement(StatusBadge, { kind, appearance: 'uppercase-pill', children: 'X' }),
    )
    // A real, non-empty color utility is emitted for this kind…
    expect(markup).toContain(colorToken)
    // …and never the dead Material-3 container tokens.
    expect(markup).not.toContain('-container')
    expect(markup).not.toMatch(/bg-[a-z]+-container/)
  })

  it('renders the leading icon', () => {
    const markup = html(
      createElement(StatusBadge, { children: 'X', icon: createElement('i', { 'data-icon': '' }) }),
    )
    expect(markup).toContain('data-icon=""')
  })

  it('forwards className in both appearances', () => {
    expect(html(createElement(StatusBadge, { children: 'X', className: 'sb-cls' }))).toContain(
      'sb-cls',
    )
    expect(
      html(
        createElement(StatusBadge, {
          children: 'X',
          appearance: 'uppercase-pill',
          className: 'sb-cls',
        }),
      ),
    ).toContain('sb-cls')
  })
})

describe('StatusPill', () => {
  it('renders its children', () => {
    const markup = html(createElement(StatusPill, { children: 'Pending' }))
    expect(markup).toContain('Pending')
  })

  it('renders the leading dot by default and omits it when dot={false}', () => {
    const withDot = html(createElement(StatusPill, { kind: 'success', children: 'X' }))
    expect(withDot).toContain('aria-hidden')
    const without = html(createElement(StatusPill, { children: 'X', dot: false }))
    expect(without).not.toContain('aria-hidden')
  })

  it('forwards className', () => {
    const markup = html(createElement(StatusPill, { children: 'X', className: 'sp-cls' }))
    expect(markup).toContain('sp-cls')
  })
})
