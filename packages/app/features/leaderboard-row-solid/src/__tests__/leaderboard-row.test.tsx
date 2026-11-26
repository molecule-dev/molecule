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

vi.mock('@molecule/app-ui-solid', async (importOriginal) => {
  return {
    ...(await importOriginal<Record<string, unknown>>()),
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

/** Dispatches a keydown with the given key on the element. */
const pressKey = (el: Element, key: string): void => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
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
    expect(up.innerHTML).toContain('textTone')
    const down = mount(() => <LeaderboardRow rank={4} name="A" score="1" rankDelta={-3} />)
    expect(down.innerHTML).toContain('▼')
    expect(down.innerHTML).toContain('textTone')
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
    expect(me.innerHTML).toContain('bgTone')
    const other = mount(() => <LeaderboardRow rank={4} name="A" score="1" />)
    expect(other.innerHTML).not.toContain('bgTone')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = mount(() => <LeaderboardRow rank={4} name="A" score="1" onClick={() => {}} />)
    expect(clickable.innerHTML).toContain('cursorPointer')
    const plain = mount(() => <LeaderboardRow rank={4} name="A" score="1" className="lr-cls" />)
    expect(plain.innerHTML).not.toContain('cursorPointer')
    expect(plain.innerHTML).toContain('lr-cls')
  })

  it('exposes an interactive row as a focusable button (role + tabindex) only when clickable', () => {
    const clickable = mount(() => <LeaderboardRow rank={4} name="A" score="1" onClick={() => {}} />)
    expect(clickable.innerHTML).toContain('role="button"')
    expect(clickable.innerHTML).toContain('tabindex="0"')
    const plain = mount(() => <LeaderboardRow rank={4} name="A" score="1" />)
    expect(plain.innerHTML).not.toContain('role="button"')
    expect(plain.innerHTML).not.toContain('tabindex')
  })

  it('enter key activates the row', () => {
    const onClick = vi.fn()
    const container = mount(() => <LeaderboardRow rank={4} name="A" score="1" onClick={onClick} />)
    pressKey(container.querySelector('div[role="button"]')!, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith()
  })

  it('space key activates the row', () => {
    const onClick = vi.fn()
    const container = mount(() => <LeaderboardRow rank={4} name="A" score="1" onClick={onClick} />)
    pressKey(container.querySelector('div[role="button"]')!, ' ')
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith()
  })

  it('other keys are ignored', () => {
    const onClick = vi.fn()
    const container = mount(() => <LeaderboardRow rank={4} name="A" score="1" onClick={onClick} />)
    const row = container.querySelector('div[role="button"]')!
    pressKey(row, 'a')
    pressKey(row, 'Tab')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('a row without onClick has no keyboard path', () => {
    const onClick = vi.fn()
    const container = mount(() => <LeaderboardRow rank={4} name="A" score="1" />)
    const row = container.querySelector('div')
    expect(row?.getAttribute('role')).toBeNull()
    expect(row?.getAttribute('tabindex')).toBeNull()
    pressKey(row!, 'Enter')
    expect(onClick).not.toHaveBeenCalled()
  })
})
