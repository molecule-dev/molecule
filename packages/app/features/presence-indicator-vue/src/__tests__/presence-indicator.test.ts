// @vitest-environment jsdom
/**
 * Unit tests for the Vue presence indicator — a port of
 * `@molecule/app-presence-indicator-react/src/__tests__/presence-indicator.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the components produce. Inline styles are set through the CSSOM,
 * so jsdom serializes them as `rgb(...)`/`0px` (the same values React's
 * runtime mount produces).
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `position`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

import { AvatarWithPresence } from '../AvatarWithPresence.js'
import { PresenceDot } from '../PresenceDot.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders one component and returns the markup it produced. */
const render = (
  component: unknown,
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('PresenceDot', () => {
  it('renders role="status" with a default presence aria-label', () => {
    const markup = render(PresenceDot, { status: 'online' })
    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-label="Presence: online"')
  })

  it('honours a custom ariaLabel', () => {
    const markup = render(PresenceDot, { status: 'away', ariaLabel: 'User is away' })
    expect(markup).toContain('aria-label="User is away"')
  })

  it('colors the dot by status', () => {
    expect(render(PresenceDot, { status: 'online' })).toContain('rgb(34, 197, 94)')
    expect(render(PresenceDot, { status: 'away' })).toContain('rgb(234, 179, 8)')
    expect(render(PresenceDot, { status: 'busy' })).toContain('rgb(239, 68, 68)')
    expect(render(PresenceDot, { status: 'offline' })).toContain('rgb(148, 163, 184)')
  })

  it('positions absolutely at the given corner when position="overlay"', () => {
    const markup = render(PresenceDot, {
      status: 'online',
      position: 'overlay',
      corner: 'top-left',
    })
    expect(markup).toContain('position: absolute')
    expect(markup).toContain('top: 0px')
    expect(markup).toContain('left: 0px')
  })

  it('stays inline (no absolute positioning) by default', () => {
    const markup = render(PresenceDot, { status: 'online' })
    expect(markup).not.toContain('position: absolute')
  })

  it('forwards className', () => {
    const markup = render(PresenceDot, { status: 'online', className: 'dot-cls' })
    expect(markup).toContain('dot-cls')
  })
})

describe('AvatarWithPresence', () => {
  it('renders its children', () => {
    const markup = render(
      AvatarWithPresence,
      {},
      { default: () => [h('img', { 'data-avatar': '' })] },
    )
    expect(markup).toContain('data-avatar=""')
  })

  it('overlays a presence dot when status is given and omits it otherwise', () => {
    const withStatus = render(AvatarWithPresence, { status: 'online' }, { default: () => ['x'] })
    expect(withStatus).toContain('role="status"')
    const without = render(AvatarWithPresence, {}, { default: () => ['x'] })
    expect(without).not.toContain('role="status"')
  })

  it('forwards className', () => {
    const markup = render(AvatarWithPresence, { className: 'awp-cls' }, { default: () => ['x'] })
    expect(markup).toContain('awp-cls')
  })
})
