// @vitest-environment jsdom
/**
 * Unit tests for the Solid presence indicator — a port of
 * `@molecule/app-presence-indicator-react/src/__tests__/presence-indicator.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the components produce. Inline styles are set through the CSSOM,
 * so jsdom serializes them as `rgb(...)`/`0px` (the same values React's
 * runtime mount produces).
 *
 * @module
 */

import { render } from 'solid-js/web'
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

import type { JSX } from 'solid-js'

const { AvatarWithPresence } = await import('../AvatarWithPresence.jsx')
const { PresenceDot } = await import('../PresenceDot.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('PresenceDot', () => {
  it('renders role="status" with a default presence aria-label', () => {
    const markup = mount(() => <PresenceDot status="online" />).innerHTML
    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-label="Presence: online"')
  })

  it('honours a custom ariaLabel', () => {
    const markup = mount(() => <PresenceDot status="away" ariaLabel="User is away" />).innerHTML
    expect(markup).toContain('aria-label="User is away"')
  })

  it('colors the dot by status', () => {
    expect(mount(() => <PresenceDot status="online" />).innerHTML).toContain('rgb(34, 197, 94)')
    expect(mount(() => <PresenceDot status="away" />).innerHTML).toContain('rgb(234, 179, 8)')
    expect(mount(() => <PresenceDot status="busy" />).innerHTML).toContain('rgb(239, 68, 68)')
    expect(mount(() => <PresenceDot status="offline" />).innerHTML).toContain('rgb(148, 163, 184)')
  })

  it('positions absolutely at the given corner when position="overlay"', () => {
    const markup = mount(() => (
      <PresenceDot status="online" position="overlay" corner="top-left" />
    )).innerHTML
    expect(markup).toContain('position: absolute')
    expect(markup).toContain('top: 0px')
    expect(markup).toContain('left: 0px')
  })

  it('stays inline (no absolute positioning) by default', () => {
    const markup = mount(() => <PresenceDot status="online" />).innerHTML
    expect(markup).not.toContain('position: absolute')
  })

  it('forwards className', () => {
    const markup = mount(() => <PresenceDot status="online" className="dot-cls" />).innerHTML
    expect(markup).toContain('dot-cls')
  })
})

describe('AvatarWithPresence', () => {
  it('renders its children', () => {
    const markup = mount(() => (
      <AvatarWithPresence>
        <img data-avatar="" />
      </AvatarWithPresence>
    )).innerHTML
    expect(markup).toContain('data-avatar=""')
  })

  it('overlays a presence dot when status is given and omits it otherwise', () => {
    const withStatus = mount(() => (
      <AvatarWithPresence status="online">x</AvatarWithPresence>
    )).innerHTML
    expect(withStatus).toContain('role="status"')
    const without = mount(() => <AvatarWithPresence>x</AvatarWithPresence>).innerHTML
    expect(without).not.toContain('role="status"')
  })

  it('forwards className', () => {
    const markup = mount(() => (
      <AvatarWithPresence className="awp-cls">x</AvatarWithPresence>
    )).innerHTML
    expect(markup).toContain('awp-cls')
  })
})
