// @vitest-environment jsdom
/**
 * Unit tests for the Solid `NotificationBadge`, `NotificationDot` and
 * `NotificationWrapper` — a port of
 * `@molecule/app-notification-badge-react/src/__tests__/notification-badge.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

const { NotificationBadge } = await import('../NotificationBadge.jsx')
const { NotificationDot } = await import('../NotificationDot.jsx')
const { NotificationWrapper } = await import('../NotificationWrapper.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a view with Solid's browser renderer and returns its container.
 *
 * @param view - The view to render.
 * @returns The container element holding the rendered markup.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/**
 * Renders a view and returns the markup it produced.
 *
 * @param view - The view to render.
 * @returns The rendered markup.
 */
const html = (view: () => JSX.Element): string => mount(view).innerHTML

describe('NotificationBadge', () => {
  it('renders the count', () => {
    expect(html(() => <NotificationBadge count={5} />)).toContain('>5<')
  })

  it('renders nothing when count is 0 (hideOnZero default)', () => {
    expect(html(() => <NotificationBadge count={0} />)).toBe('')
  })

  it('renders nothing for a negative count under the default hideOnZero', () => {
    expect(html(() => <NotificationBadge count={-3} />)).toBe('')
  })

  it('renders a 0 badge when hideOnZero is false', () => {
    expect(html(() => <NotificationBadge count={0} hideOnZero={false} />)).toContain('>0<')
  })

  it('clamps to "99+" by default when count exceeds the max', () => {
    expect(html(() => <NotificationBadge count={250} />)).toContain('99+')
  })

  it('honours a custom max for the overflow display', () => {
    expect(html(() => <NotificationBadge count={12} max={9} />)).toContain('9+')
  })

  it('shows the raw count when it equals the max (no overflow)', () => {
    expect(html(() => <NotificationBadge count={99} />)).toContain('>99<')
  })

  it('sets aria-label to the true count even when display overflows', () => {
    expect(html(() => <NotificationBadge count={250} />)).toContain('aria-label="250"')
  })

  it('maps each variant to its background token', () => {
    for (const [variant, bg] of [
      ['error', 'bg-error'],
      ['warning', 'bg-warning'],
      ['info', 'bg-info'],
      ['success', 'bg-success'],
      ['neutral', 'bg-surface-secondary'],
    ] as const) {
      expect(html(() => <NotificationBadge count={1} variant={variant} />)).toContain(bg)
    }
  })

  it('gives the neutral variant a visible surface (never the phantom bg-outline)', () => {
    const markup = html(() => <NotificationBadge count={1} variant="neutral" />)
    // A real, theme-defined surface token — visible in light and dark themes.
    expect(markup).toContain('bg-surface-secondary')
    // The old phantom class no theme defines must not resurface.
    expect(markup).not.toContain('bg-outline')
    // Sanity: the emitted class list is non-empty.
    expect(markup).toMatch(/class="[^"]*bg-surface-secondary[^"]*"/)
  })

  it('defaults to the error variant', () => {
    expect(html(() => <NotificationBadge count={1} />)).toContain('bg-error')
  })

  it('forwards className', () => {
    expect(html(() => <NotificationBadge count={1} className="badge-cls" />)).toContain('badge-cls')
  })
})

describe('NotificationDot', () => {
  it('renders by default (visible defaults to true)', () => {
    expect(html(() => <NotificationDot />)).toContain('<span')
  })

  it('renders nothing when visible is false', () => {
    expect(html(() => <NotificationDot visible={false} />)).toBe('')
  })

  it('is aria-hidden (presence indicator, not announced)', () => {
    expect(html(() => <NotificationDot />)).toContain('aria-hidden="true"')
  })

  it('maps each variant to its background token', () => {
    expect(html(() => <NotificationDot variant="success" />)).toContain('bg-success')
    expect(html(() => <NotificationDot variant="neutral" />)).toContain('bg-surface-secondary')
  })

  it('gives the neutral dot a visible surface (never the phantom bg-outline)', () => {
    const markup = html(() => <NotificationDot variant="neutral" />)
    expect(markup).toContain('bg-surface-secondary')
    expect(markup).not.toContain('bg-outline')
  })

  it('defaults to an 8px inline dot', () => {
    const markup = html(() => <NotificationDot />)
    expect(markup).toContain('width: 8px')
    expect(markup).toContain('display: inline-block')
  })

  it('honours a custom size', () => {
    expect(html(() => <NotificationDot size={14} />)).toContain('width: 14px')
  })

  it('absolutely positions at the corner when position="corner"', () => {
    const markup = html(() => <NotificationDot position="corner" />)
    expect(markup).toContain('position: absolute')
    expect(markup).toContain('top: 2px')
    expect(markup).toContain('right: 2px')
  })

  it('forwards className', () => {
    expect(html(() => <NotificationDot className="dot-cls" />)).toContain('dot-cls')
  })
})

describe('NotificationWrapper', () => {
  it('renders its child', () => {
    const markup = html(() => (
      <NotificationWrapper count={3}>
        <button data-child="">inbox</button>
      </NotificationWrapper>
    ))
    expect(markup).toContain('data-child=""')
    expect(markup).toContain('inbox')
  })

  it('renders the badge alongside the child when count > 0', () => {
    const markup = html(() => <NotificationWrapper count={3}>x</NotificationWrapper>)
    expect(markup).toContain('>3<')
  })

  it('hides the badge when count is 0 (hideOnZero default) but still renders the child', () => {
    const markup = html(() => <NotificationWrapper count={0}>child-text</NotificationWrapper>)
    expect(markup).toContain('child-text')
    expect(markup).not.toContain('aria-label="0"')
  })

  it('positions top-right by default (top + right offsets)', () => {
    const markup = html(() => <NotificationWrapper count={1}>x</NotificationWrapper>)
    expect(markup).toContain('top: -4px')
    expect(markup).toContain('right: -4px')
  })

  it('positions bottom-left when placement="bottom-left"', () => {
    const markup = html(() => (
      <NotificationWrapper count={1} placement="bottom-left">
        x
      </NotificationWrapper>
    ))
    expect(markup).toContain('bottom: -4px')
    expect(markup).toContain('left: -4px')
  })

  it('forwards the variant down to the badge', () => {
    const markup = html(() => (
      <NotificationWrapper count={1} variant="info">
        x
      </NotificationWrapper>
    ))
    expect(markup).toContain('bg-info')
  })

  it('forwards className onto the relative wrapper', () => {
    expect(
      html(() => (
        <NotificationWrapper count={1} className="wrap-cls">
          x
        </NotificationWrapper>
      )),
    ).toContain('wrap-cls')
  })
})
