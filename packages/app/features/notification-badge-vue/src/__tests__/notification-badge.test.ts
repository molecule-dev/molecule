// @vitest-environment jsdom
/**
 * Unit tests for the Vue `NotificationBadge`, `NotificationDot` and
 * `NotificationWrapper` — a port of
 * `@molecule/app-notification-badge-react/src/__tests__/notification-badge.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins truthy strings, every other access
// yields its key as a string token, so emitted classNames are inspectable —
// the same mock the React tests use.
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { NotificationBadge } from '../NotificationBadge.js'
import { NotificationDot } from '../NotificationDot.js'
import { NotificationWrapper } from '../NotificationWrapper.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders one component and returns the element it mounted into.
 *
 * @param component - The component under test.
 * @param props - Its props.
 * @param children - Its default slot content.
 * @returns The host element holding the rendered markup.
 */
const mount = (
  component: Parameters<typeof h>[0],
  props: Record<string, unknown>,
  children?: () => VNodeChild[],
): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({ render: () => h(component, props, { default: children }) }),
  )
  app.mount(host)
  return host
}

/**
 * Renders one component and returns the markup it produced.
 *
 * @param component - The component under test.
 * @param props - Its props.
 * @param children - Its default slot content.
 * @returns The rendered markup.
 */
const render = (
  component: Parameters<typeof h>[0],
  props: Record<string, unknown>,
  children?: () => VNodeChild[],
): string => mount(component, props, children).innerHTML

describe('NotificationBadge', () => {
  it('renders the count', () => {
    expect(render(NotificationBadge, { count: 5 })).toContain('>5<')
  })

  it('renders nothing when count is 0 (hideOnZero default)', () => {
    const host = mount(NotificationBadge, { count: 0 })
    expect(host.innerHTML).not.toContain('<span')
    expect(host.textContent).toBe('')
  })

  it('renders nothing for a negative count under the default hideOnZero', () => {
    const host = mount(NotificationBadge, { count: -3 })
    expect(host.innerHTML).not.toContain('<span')
    expect(host.textContent).toBe('')
  })

  it('renders a 0 badge when hideOnZero is false', () => {
    expect(render(NotificationBadge, { count: 0, hideOnZero: false })).toContain('>0<')
  })

  it('clamps to "99+" by default when count exceeds the max', () => {
    expect(render(NotificationBadge, { count: 250 })).toContain('99+')
  })

  it('honours a custom max for the overflow display', () => {
    expect(render(NotificationBadge, { count: 12, max: 9 })).toContain('9+')
  })

  it('shows the raw count when it equals the max (no overflow)', () => {
    expect(render(NotificationBadge, { count: 99 })).toContain('>99<')
  })

  it('sets aria-label to the true count even when display overflows', () => {
    expect(render(NotificationBadge, { count: 250 })).toContain('aria-label="250"')
  })

  it('maps each variant to its background token', () => {
    for (const [variant, bg] of [
      ['error', 'bg-error'],
      ['warning', 'bg-warning'],
      ['info', 'bg-info'],
      ['success', 'bg-success'],
      ['neutral', 'bg-surface-secondary'],
    ] as const) {
      expect(render(NotificationBadge, { count: 1, variant })).toContain(bg)
    }
  })

  it('gives the neutral variant a visible surface (never the phantom bg-outline)', () => {
    const markup = render(NotificationBadge, { count: 1, variant: 'neutral' })
    // A real, theme-defined surface token — visible in light and dark themes.
    expect(markup).toContain('bg-surface-secondary')
    // The old phantom class no theme defines must not resurface.
    expect(markup).not.toContain('bg-outline')
    // Sanity: the emitted class list is non-empty.
    expect(markup).toMatch(/class="[^"]*bg-surface-secondary[^"]*"/)
  })

  it('defaults to the error variant', () => {
    expect(render(NotificationBadge, { count: 1 })).toContain('bg-error')
  })

  it('forwards className', () => {
    expect(render(NotificationBadge, { count: 1, className: 'badge-cls' })).toContain('badge-cls')
  })
})

describe('NotificationDot', () => {
  it('renders by default (visible defaults to true)', () => {
    expect(render(NotificationDot, {})).toContain('<span')
  })

  it('renders nothing when visible is false', () => {
    const host = mount(NotificationDot, { visible: false })
    expect(host.innerHTML).not.toContain('<span')
    expect(host.textContent).toBe('')
  })

  it('is aria-hidden (presence indicator, not announced)', () => {
    expect(render(NotificationDot, {})).toContain('aria-hidden="true"')
  })

  it('maps each variant to its background token', () => {
    expect(render(NotificationDot, { variant: 'success' })).toContain('bg-success')
    expect(render(NotificationDot, { variant: 'neutral' })).toContain('bg-surface-secondary')
  })

  it('gives the neutral dot a visible surface (never the phantom bg-outline)', () => {
    const markup = render(NotificationDot, { variant: 'neutral' })
    expect(markup).toContain('bg-surface-secondary')
    expect(markup).not.toContain('bg-outline')
  })

  it('defaults to an 8px inline dot', () => {
    const markup = render(NotificationDot, {})
    expect(markup).toContain('width: 8px')
    expect(markup).toContain('display: inline-block')
  })

  it('honours a custom size', () => {
    expect(render(NotificationDot, { size: 14 })).toContain('width: 14px')
  })

  it('absolutely positions at the corner when position="corner"', () => {
    const markup = render(NotificationDot, { position: 'corner' })
    expect(markup).toContain('position: absolute')
    expect(markup).toContain('top: 2px')
    expect(markup).toContain('right: 2px')
  })

  it('forwards className', () => {
    expect(render(NotificationDot, { className: 'dot-cls' })).toContain('dot-cls')
  })
})

describe('NotificationWrapper', () => {
  it('renders its child', () => {
    const markup = render(NotificationWrapper, { count: 3 }, () => [
      h('button', { 'data-child': '' }, 'inbox'),
    ])
    expect(markup).toContain('data-child=""')
    expect(markup).toContain('inbox')
  })

  it('renders the badge alongside the child when count > 0', () => {
    const markup = render(NotificationWrapper, { count: 3 }, () => ['x'])
    expect(markup).toContain('>3<')
  })

  it('hides the badge when count is 0 (hideOnZero default) but still renders the child', () => {
    const markup = render(NotificationWrapper, { count: 0 }, () => ['child-text'])
    expect(markup).toContain('child-text')
    expect(markup).not.toContain('aria-label="0"')
  })

  it('positions top-right by default (top + right offsets)', () => {
    const markup = render(NotificationWrapper, { count: 1 }, () => ['x'])
    expect(markup).toContain('top: -4px')
    expect(markup).toContain('right: -4px')
  })

  it('positions bottom-left when placement="bottom-left"', () => {
    const markup = render(NotificationWrapper, { count: 1, placement: 'bottom-left' }, () => ['x'])
    expect(markup).toContain('bottom: -4px')
    expect(markup).toContain('left: -4px')
  })

  it('forwards the variant down to the badge', () => {
    const markup = render(NotificationWrapper, { count: 1, variant: 'info' }, () => ['x'])
    expect(markup).toContain('bg-info')
  })

  it('forwards className onto the relative wrapper', () => {
    expect(render(NotificationWrapper, { count: 1, className: 'wrap-cls' }, () => ['x'])).toContain(
      'wrap-cls',
    )
  })
})
