// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `LeaderboardRow` — a port of
 * `@molecule/app-leaderboard-row-react/src/__tests__/leaderboard-row.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and
 * asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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

vi.mock('@molecule/app-ui-svelte', async () => {
  const { default: Avatar } = await import('./stubs/AvatarStub.svelte')
  return { Avatar }
})

import { mount, unmount } from 'svelte'

import type { LeaderboardRowProps } from '../types.js'

const { LeaderboardRow } = await import('../components.js')

/** The mounted components, unmounted after each test. */
const mounted: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const component of mounted.splice(0)) void unmount(component)
  document.body.innerHTML = ''
})

/** Renders a {@link LeaderboardRow} and returns the markup it produced. */
const render = (props: LeaderboardRowProps): string => {
  const target = mountRow(props)
  const markup = target.innerHTML
  target.remove()
  return markup
}

/**
 * Mounts a {@link LeaderboardRow} and returns its target element (the string
 * renderer cannot fire events).
 */
const mountRow = (props: LeaderboardRowProps): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(LeaderboardRow, { target, props }))
  return target
}

/** Dispatches a keydown with the given key on the element. */
const pressKey = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('LeaderboardRow', () => {
  it('renders the name, score, and avatar', () => {
    const markup = render({ rank: 5, name: 'Zoe', score: '1,200' })
    expect(markup).toContain('Zoe')
    expect(markup).toContain('1,200')
    expect(markup).toContain('data-avatar-name="Zoe"')
  })

  it('renders a medal for the top three ranks and #N for the rest', () => {
    expect(render({ rank: 1, name: 'A', score: '1' })).toContain('🥇')
    expect(render({ rank: 2, name: 'A', score: '1' })).toContain('🥈')
    expect(render({ rank: 3, name: 'A', score: '1' })).toContain('🥉')
    expect(render({ rank: 8, name: 'A', score: '1' })).toContain('#8')
  })

  it('renders an up/down arrow for a non-zero rankDelta', () => {
    const up = render({ rank: 4, name: 'A', score: '1', rankDelta: 2 })
    expect(up).toContain('▲')
    expect(up).toContain('textTone')
    const down = render({ rank: 4, name: 'A', score: '1', rankDelta: -3 })
    expect(down).toContain('▼')
    expect(down).toContain('textTone')
  })

  it('renders no delta indicator when rankDelta is 0 or absent', () => {
    expect(render({ rank: 4, name: 'A', score: '1', rankDelta: 0 })).not.toContain('▲')
    expect(render({ rank: 4, name: 'A', score: '1' })).not.toContain('▼')
  })

  it('renders the subtitle when present', () => {
    const markup = render({ rank: 4, name: 'A', score: '1', subtitle: 'Team Red' })
    expect(markup).toContain('Team Red')
  })

  it('applies the highlight background when isMe is set', () => {
    const me = render({ rank: 4, name: 'A', score: '1', isMe: true })
    expect(me).toContain('bgTone')
    const other = render({ rank: 4, name: 'A', score: '1' })
    expect(other).not.toContain('bgTone')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = render({ rank: 4, name: 'A', score: '1', onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = render({ rank: 4, name: 'A', score: '1', className: 'lr-cls' })
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('lr-cls')
  })

  it('exposes an interactive row as a focusable button (role + tabindex) only when clickable', () => {
    const clickable = render({ rank: 4, name: 'A', score: '1', onClick: () => {} })
    expect(clickable).toContain('role="button"')
    expect(clickable).toContain('tabindex="0"')
    const plain = render({ rank: 4, name: 'A', score: '1' })
    expect(plain).not.toContain('role="button"')
    expect(plain).not.toContain('tabindex')
  })

  it('enter key activates the row', () => {
    const onClick = vi.fn()
    const target = mountRow({ rank: 4, name: 'A', score: '1', onClick })
    pressKey(target.querySelector('div[role="button"]')!, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith()
  })

  it('space key activates the row', () => {
    const onClick = vi.fn()
    const target = mountRow({ rank: 4, name: 'A', score: '1', onClick })
    pressKey(target.querySelector('div[role="button"]')!, ' ')
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith()
  })

  it('other keys are ignored', () => {
    const onClick = vi.fn()
    const target = mountRow({ rank: 4, name: 'A', score: '1', onClick })
    const row = target.querySelector('div[role="button"]')!
    pressKey(row, 'a')
    pressKey(row, 'Tab')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('a row without onClick has no keyboard path', () => {
    const onClick = vi.fn()
    const target = mountRow({ rank: 4, name: 'A', score: '1' })
    const row = target.querySelector('div')
    expect(row?.getAttribute('role')).toBeNull()
    expect(row?.getAttribute('tabindex')).toBeNull()
    pressKey(row!, 'Enter')
    expect(onClick).not.toHaveBeenCalled()
  })
})
