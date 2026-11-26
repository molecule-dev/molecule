// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LeaderboardRowProps } from '../LeaderboardRow.js'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Avatar: ({ src, name }: { src?: string; name?: string }) =>
    createElement('img', { 'data-avatar': src ?? '', 'data-avatar-name': name ?? '' }),
}))

const { LeaderboardRow } = await import('../LeaderboardRow.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

/** Mounted roots, unmounted after each test. */
const mounted: Array<() => void> = []

afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
})

/**
 * Mounts the component into the document (the string renderer cannot fire
 * events) and returns its host element.
 */
const mount = (props: LeaderboardRowProps): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(createElement(LeaderboardRow, props))
  })
  mounted.push(() => {
    act(() => {
      root.unmount()
    })
    host.remove()
  })
  return host
}

/** Dispatches a keydown with the given key on the element. */
const pressKey = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('LeaderboardRow', () => {
  it('renders the name, score, and avatar', () => {
    const markup = html(createElement(LeaderboardRow, { rank: 5, name: 'Zoe', score: '1,200' }))
    expect(markup).toContain('Zoe')
    expect(markup).toContain('1,200')
    expect(markup).toContain('data-avatar-name="Zoe"')
  })

  it('renders a medal for the top three ranks and #N for the rest', () => {
    expect(html(createElement(LeaderboardRow, { rank: 1, name: 'A', score: '1' }))).toContain('🥇')
    expect(html(createElement(LeaderboardRow, { rank: 2, name: 'A', score: '1' }))).toContain('🥈')
    expect(html(createElement(LeaderboardRow, { rank: 3, name: 'A', score: '1' }))).toContain('🥉')
    expect(html(createElement(LeaderboardRow, { rank: 8, name: 'A', score: '1' }))).toContain('#8')
  })

  it('renders an up/down arrow for a non-zero rankDelta', () => {
    const up = html(createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', rankDelta: 2 }))
    expect(up).toContain('▲')
    expect(up).toContain('textTone')
    const down = html(
      createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', rankDelta: -3 }),
    )
    expect(down).toContain('▼')
    expect(down).toContain('textTone')
  })

  it('renders no delta indicator when rankDelta is 0 or absent', () => {
    expect(
      html(createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', rankDelta: 0 })),
    ).not.toContain('▲')
    expect(html(createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1' }))).not.toContain(
      '▼',
    )
  })

  it('renders the subtitle when present', () => {
    const markup = html(
      createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', subtitle: 'Team Red' }),
    )
    expect(markup).toContain('Team Red')
  })

  it('applies the highlight background when isMe is set', () => {
    const me = html(createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', isMe: true }))
    expect(me).toContain('bgTone')
    const other = html(createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1' }))
    expect(other).not.toContain('bgTone')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = html(
      createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', onClick: () => {} }),
    )
    expect(clickable).toContain('cursorPointer')
    const plain = html(
      createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', className: 'lr-cls' }),
    )
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('lr-cls')
  })

  it('exposes an interactive row as a focusable button (role + tabindex) only when clickable', () => {
    const clickable = html(
      createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1', onClick: () => {} }),
    )
    expect(clickable).toContain('role="button"')
    expect(clickable).toContain('tabindex="0"')
    const plain = html(createElement(LeaderboardRow, { rank: 4, name: 'A', score: '1' }))
    expect(plain).not.toContain('role="button"')
    expect(plain).not.toContain('tabindex')
  })

  it('enter key activates the row', () => {
    const onClick = vi.fn()
    const host = mount({ rank: 4, name: 'A', score: '1', onClick })
    pressKey(host.querySelector('div[role="button"]')!, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith()
  })

  it('space key activates the row', () => {
    const onClick = vi.fn()
    const host = mount({ rank: 4, name: 'A', score: '1', onClick })
    pressKey(host.querySelector('div[role="button"]')!, ' ')
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith()
  })

  it('other keys are ignored', () => {
    const onClick = vi.fn()
    const host = mount({ rank: 4, name: 'A', score: '1', onClick })
    const row = host.querySelector('div[role="button"]')!
    pressKey(row, 'a')
    pressKey(row, 'Tab')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('a row without onClick has no keyboard path', () => {
    const onClick = vi.fn()
    const host = mount({ rank: 4, name: 'A', score: '1' })
    const row = host.querySelector('div')
    expect(row?.getAttribute('role')).toBeNull()
    expect(row?.getAttribute('tabindex')).toBeNull()
    pressKey(row!, 'Enter')
    expect(onClick).not.toHaveBeenCalled()
  })
})
