// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `NotificationBadge`, `NotificationDot` and
 * `NotificationWrapper` — a port of
 * `@molecule/app-notification-badge-react/src/__tests__/notification-badge.test.tsx`:
 * the same behavioral assertions, rendered with a real Svelte mount (jsdom)
 * and the bonded ClassMap. Inline styles are set through the CSSOM, so jsdom
 * serializes them as `20px` (the same values React's runtime mount produces).
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import NotificationBadge from '../NotificationBadge.svelte'
import NotificationDot from '../NotificationDot.svelte'
import NotificationWrapper from '../NotificationWrapper.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Mounts a component with the given props and returns the host markup.
 *
 * @param component - The component to mount.
 * @param props - The component props.
 * @returns The markup of the mounted component.
 */
function render(component: unknown, props: Record<string, unknown>): string {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(Host, {
    target: host,
    props: {
      config: {},
      setMoleculeContext,
      component,
      props,
    },
  })
  flushSync()
  const markup = host.innerHTML
  unmount(instance)
  host.remove()
  return markup
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('NotificationBadge', () => {
  it('renders the count', () => {
    expect(render(NotificationBadge, { count: 5 })).toContain('>5<')
  })

  it('renders nothing when count is 0 (hideOnZero default)', () => {
    const markup = render(NotificationBadge, { count: 0 })
    expect(markup).not.toContain('<span')
    expect(markup.replace(/<!--[\s\S]*?-->/g, '')).toBe('')
  })

  it('renders nothing for a negative count under the default hideOnZero', () => {
    const markup = render(NotificationBadge, { count: -3 })
    expect(markup).not.toContain('<span')
    expect(markup.replace(/<!--[\s\S]*?-->/g, '')).toBe('')
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
    const markup = render(NotificationDot, { visible: false })
    expect(markup).not.toContain('<span')
    expect(markup.replace(/<!--[\s\S]*?-->/g, '')).toBe('')
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
    const markup = render(NotificationWrapper, {
      count: 3,
      children: raw('<button data-child>inbox</button>'),
    })
    expect(markup).toContain('data-child')
    expect(markup).toContain('inbox')
  })

  it('renders the badge alongside the child when count > 0', () => {
    const markup = render(NotificationWrapper, { count: 3, children: raw('x') })
    expect(markup).toContain('>3<')
  })

  it('hides the badge when count is 0 (hideOnZero default) but still renders the child', () => {
    const markup = render(NotificationWrapper, { count: 0, children: raw('child-text') })
    expect(markup).toContain('child-text')
    expect(markup).not.toContain('aria-label="0"')
  })

  it('positions top-right by default (top + right offsets)', () => {
    const markup = render(NotificationWrapper, { count: 1, children: raw('x') })
    expect(markup).toContain('top: -4px')
    expect(markup).toContain('right: -4px')
  })

  it('positions bottom-left when placement="bottom-left"', () => {
    const markup = render(NotificationWrapper, {
      count: 1,
      placement: 'bottom-left',
      children: raw('x'),
    })
    expect(markup).toContain('bottom: -4px')
    expect(markup).toContain('left: -4px')
  })

  it('forwards the variant down to the badge', () => {
    const markup = render(NotificationWrapper, { count: 1, variant: 'info', children: raw('x') })
    expect(markup).toContain('bg-info')
  })

  it('forwards className onto the relative wrapper', () => {
    expect(
      render(NotificationWrapper, { count: 1, className: 'wrap-cls', children: raw('x') }),
    ).toContain('wrap-cls')
  })
})
