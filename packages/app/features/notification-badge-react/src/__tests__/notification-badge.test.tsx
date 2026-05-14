import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins truthy strings, every other access
// yields its key as a string token, so emitted classNames are inspectable.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
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

const { NotificationBadge } = await import('../NotificationBadge.js')
const { NotificationDot } = await import('../NotificationDot.js')
const { NotificationWrapper } = await import('../NotificationWrapper.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('NotificationBadge', () => {
  it('renders the count', () => {
    expect(html(createElement(NotificationBadge, { count: 5 }))).toContain('>5<')
  })

  it('renders nothing when count is 0 (hideOnZero default)', () => {
    expect(html(createElement(NotificationBadge, { count: 0 }))).toBe('')
  })

  it('renders nothing for a negative count under the default hideOnZero', () => {
    expect(html(createElement(NotificationBadge, { count: -3 }))).toBe('')
  })

  it('renders a 0 badge when hideOnZero is false', () => {
    expect(html(createElement(NotificationBadge, { count: 0, hideOnZero: false }))).toContain('>0<')
  })

  it('clamps to "99+" by default when count exceeds the max', () => {
    expect(html(createElement(NotificationBadge, { count: 250 }))).toContain('99+')
  })

  it('honours a custom max for the overflow display', () => {
    expect(html(createElement(NotificationBadge, { count: 12, max: 9 }))).toContain('9+')
  })

  it('shows the raw count when it equals the max (no overflow)', () => {
    expect(html(createElement(NotificationBadge, { count: 99 }))).toContain('>99<')
  })

  it('sets aria-label to the true count even when display overflows', () => {
    expect(html(createElement(NotificationBadge, { count: 250 }))).toContain('aria-label="250"')
  })

  it('maps each variant to its background token', () => {
    for (const [variant, bg] of [
      ['error', 'bg-error'],
      ['warning', 'bg-warning'],
      ['info', 'bg-info'],
      ['success', 'bg-success'],
      ['neutral', 'bg-outline'],
    ] as const) {
      expect(html(createElement(NotificationBadge, { count: 1, variant }))).toContain(bg)
    }
  })

  it('defaults to the error variant', () => {
    expect(html(createElement(NotificationBadge, { count: 1 }))).toContain('bg-error')
  })

  it('forwards className', () => {
    expect(html(createElement(NotificationBadge, { count: 1, className: 'badge-cls' }))).toContain(
      'badge-cls',
    )
  })
})

describe('NotificationDot', () => {
  it('renders by default (visible defaults to true)', () => {
    expect(html(createElement(NotificationDot, {}))).toContain('<span')
  })

  it('renders nothing when visible is false', () => {
    expect(html(createElement(NotificationDot, { visible: false }))).toBe('')
  })

  it('is aria-hidden (presence indicator, not announced)', () => {
    expect(html(createElement(NotificationDot, {}))).toContain('aria-hidden="true"')
  })

  it('maps each variant to its background token', () => {
    expect(html(createElement(NotificationDot, { variant: 'success' }))).toContain('bg-success')
    expect(html(createElement(NotificationDot, { variant: 'neutral' }))).toContain('bg-outline')
  })

  it('defaults to an 8px inline dot', () => {
    const markup = html(createElement(NotificationDot, {}))
    expect(markup).toContain('width:8px')
    expect(markup).toContain('display:inline-block')
  })

  it('honours a custom size', () => {
    expect(html(createElement(NotificationDot, { size: 14 }))).toContain('width:14px')
  })

  it('absolutely positions at the corner when position="corner"', () => {
    const markup = html(createElement(NotificationDot, { position: 'corner' }))
    expect(markup).toContain('position:absolute')
    expect(markup).toContain('top:2px')
    expect(markup).toContain('right:2px')
  })

  it('forwards className', () => {
    expect(html(createElement(NotificationDot, { className: 'dot-cls' }))).toContain('dot-cls')
  })
})

describe('NotificationWrapper', () => {
  it('renders its child', () => {
    const markup = html(
      createElement(
        NotificationWrapper,
        { count: 3 },
        createElement('button', { 'data-child': '' }, 'inbox'),
      ),
    )
    expect(markup).toContain('data-child=""')
    expect(markup).toContain('inbox')
  })

  it('renders the badge alongside the child when count > 0', () => {
    const markup = html(createElement(NotificationWrapper, { count: 3 }, 'x'))
    expect(markup).toContain('>3<')
  })

  it('hides the badge when count is 0 (hideOnZero default) but still renders the child', () => {
    const markup = html(createElement(NotificationWrapper, { count: 0 }, 'child-text'))
    expect(markup).toContain('child-text')
    expect(markup).not.toContain('aria-label="0"')
  })

  it('positions top-right by default (top + right offsets)', () => {
    const markup = html(createElement(NotificationWrapper, { count: 1 }, 'x'))
    expect(markup).toContain('top:-4px')
    expect(markup).toContain('right:-4px')
  })

  it('positions bottom-left when placement="bottom-left"', () => {
    const markup = html(
      createElement(NotificationWrapper, { count: 1, placement: 'bottom-left' }, 'x'),
    )
    expect(markup).toContain('bottom:-4px')
    expect(markup).toContain('left:-4px')
  })

  it('forwards the variant down to the badge', () => {
    const markup = html(createElement(NotificationWrapper, { count: 1, variant: 'info' }, 'x'))
    expect(markup).toContain('bg-info')
  })

  it('forwards className onto the relative wrapper', () => {
    expect(
      html(createElement(NotificationWrapper, { count: 1, className: 'wrap-cls' }, 'x')),
    ).toContain('wrap-cls')
  })
})
