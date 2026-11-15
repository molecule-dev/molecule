// @vitest-environment jsdom
/**
 * Unit tests for the Solid `LeaderboardRow` — a port of
 * `@molecule/app-leaderboard-row-react/src/__tests__/leaderboard-row.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

vi.mock('@molecule/app-ui-solid', async () => {
  return {
    // The same stub the React tests install for `@molecule/app-ui-react`:
    // an `<img data-avatar data-avatar-name>`.
    Avatar: (props: { src?: string; name?: string }) => {
      const img = document.createElement('img')
      img.setAttribute('data-avatar', props.src ?? '')
      img.setAttribute('data-avatar-name', props.name ?? '')
      return img
    },
  }
})

const { LeaderboardRow } = await import('../LeaderboardRow.jsx')

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

describe('LeaderboardRow', () => {
  it('renders the name, score, and avatar', () => {
    const container = mount(() => <LeaderboardRow rank={5} name="Zoe" score="1,200" />)
    expect(container.innerHTML).toContain('Zoe')
    expect(container.innerHTML).toContain('1,200')
    expect(container.innerHTML).toContain('data-avatar-name="Zoe"')
  })

  it('renders a medal for the top three ranks and #N for the rest', () => {
    expect(mount(() => <LeaderboardRow rank={1} name="A" score="1" />).innerHTML).toContain('🥇')
    expect(mount(() => <LeaderboardRow rank={2} name="A" score="1" />).innerHTML).toContain('🥈')
    expect(mount(() => <LeaderboardRow rank={3} name="A" score="1" />).innerHTML).toContain('🥉')
    expect(mount(() => <LeaderboardRow rank={8} name="A" score="1" />).innerHTML).toContain('#8')
  })

  it('renders an up/down arrow for a non-zero rankDelta', () => {
    const up = mount(() => <LeaderboardRow rank={4} name="A" score="1" rankDelta={2} />)
    expect(up.innerHTML).toContain('▲')
    // Inline colors go through CSSOM, so jsdom serializes the hex values as
    // `rgb(...)` — the same values React's static markup writes as hex.
    expect(up.innerHTML).toContain('color: rgb(34, 197, 94)')
    const down = mount(() => <LeaderboardRow rank={4} name="A" score="1" rankDelta={-3} />)
    expect(down.innerHTML).toContain('▼')
    expect(down.innerHTML).toContain('color: rgb(239, 68, 68)')
  })

  it('renders no delta indicator when rankDelta is 0 or absent', () => {
    expect(
      mount(() => <LeaderboardRow rank={4} name="A" score="1" rankDelta={0} />).innerHTML,
    ).not.toContain('▲')
    expect(mount(() => <LeaderboardRow rank={4} name="A" score="1" />).innerHTML).not.toContain('▼')
  })

  it('renders the subtitle when present', () => {
    const container = mount(() => (
      <LeaderboardRow rank={4} name="A" score="1" subtitle="Team Red" />
    ))
    expect(container.innerHTML).toContain('Team Red')
  })

  it('applies the highlight background when isMe is set', () => {
    const me = mount(() => <LeaderboardRow rank={4} name="A" score="1" isMe={true} />)
    expect(me.innerHTML).toContain('background: rgba(96, 165, 250, 0.1)')
    const other = mount(() => <LeaderboardRow rank={4} name="A" score="1" />)
    expect(other.innerHTML).not.toContain('rgba(96, 165, 250, 0.1)')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = mount(() => <LeaderboardRow rank={4} name="A" score="1" onClick={() => {}} />)
    expect(clickable.innerHTML).toContain('cursorPointer')
    const plain = mount(() => <LeaderboardRow rank={4} name="A" score="1" className="lr-cls" />)
    expect(plain.innerHTML).not.toContain('cursorPointer')
    expect(plain.innerHTML).toContain('lr-cls')
  })
})
