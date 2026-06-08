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

const { AvatarWithPresence } = await import('../AvatarWithPresence.js')
const { PresenceDot } = await import('../PresenceDot.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('PresenceDot', () => {
  it('renders role="status" with a default presence aria-label', () => {
    const markup = html(createElement(PresenceDot, { status: 'online' }))
    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-label="Presence: online"')
  })

  it('honours a custom ariaLabel', () => {
    const markup = html(createElement(PresenceDot, { status: 'away', ariaLabel: 'User is away' }))
    expect(markup).toContain('aria-label="User is away"')
  })

  it('colors the dot by status', () => {
    expect(html(createElement(PresenceDot, { status: 'online' }))).toContain('background:#22c55e')
    expect(html(createElement(PresenceDot, { status: 'away' }))).toContain('background:#eab308')
    expect(html(createElement(PresenceDot, { status: 'busy' }))).toContain('background:#ef4444')
    expect(html(createElement(PresenceDot, { status: 'offline' }))).toContain('background:#94a3b8')
  })

  it('positions absolutely at the given corner when position="overlay"', () => {
    const markup = html(
      createElement(PresenceDot, { status: 'online', position: 'overlay', corner: 'top-left' }),
    )
    expect(markup).toContain('position:absolute')
    expect(markup).toContain('top:0')
    expect(markup).toContain('left:0')
  })

  it('stays inline (no absolute positioning) by default', () => {
    const markup = html(createElement(PresenceDot, { status: 'online' }))
    expect(markup).not.toContain('position:absolute')
  })

  it('forwards className', () => {
    const markup = html(createElement(PresenceDot, { status: 'online', className: 'dot-cls' }))
    expect(markup).toContain('dot-cls')
  })
})

describe('AvatarWithPresence', () => {
  it('renders its children', () => {
    const markup = html(
      createElement(AvatarWithPresence, { children: createElement('img', { 'data-avatar': '' }) }),
    )
    expect(markup).toContain('data-avatar=""')
  })

  it('overlays a presence dot when status is given and omits it otherwise', () => {
    const withStatus = html(createElement(AvatarWithPresence, { children: 'x', status: 'online' }))
    expect(withStatus).toContain('role="status"')
    const without = html(createElement(AvatarWithPresence, { children: 'x' }))
    expect(without).not.toContain('role="status"')
  })

  it('forwards className', () => {
    const markup = html(createElement(AvatarWithPresence, { children: 'x', className: 'awp-cls' }))
    expect(markup).toContain('awp-cls')
  })
})
