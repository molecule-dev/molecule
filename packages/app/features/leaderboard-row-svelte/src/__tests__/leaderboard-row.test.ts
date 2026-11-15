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

const { LeaderboardRow } = await import('../components.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link LeaderboardRow} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(LeaderboardRow, { target, props })
  const markup = target.innerHTML
  void unmount(component)
  target.remove()
  return markup
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
    // Inline colors go through CSSOM, so jsdom serializes the hex values as
    // `rgb(...)` — the same values React's static markup writes as hex.
    expect(up).toContain('color: rgb(34, 197, 94)')
    const down = render({ rank: 4, name: 'A', score: '1', rankDelta: -3 })
    expect(down).toContain('▼')
    expect(down).toContain('color: rgb(239, 68, 68)')
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
    expect(me).toContain('background: rgba(96, 165, 250, 0.1)')
    const other = render({ rank: 4, name: 'A', score: '1' })
    expect(other).not.toContain('rgba(96, 165, 250, 0.1)')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = render({ rank: 4, name: 'A', score: '1', onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = render({ rank: 4, name: 'A', score: '1', className: 'lr-cls' })
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('lr-cls')
  })
})
