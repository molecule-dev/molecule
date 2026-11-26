// @vitest-environment jsdom
/**
 * Unit tests for the Solid `LeaderboardList` — a port of
 * `@molecule/app-leaderboard-list-react/src/__tests__/leaderboard-list.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom.
 *
 * @module
 */
import { createSignal, For, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* call was applied without a real
// bond — the same mock the React package's own tests use.
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

const { LeaderboardList } = await import('../LeaderboardList.jsx')

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

describe('LeaderboardList', () => {
  it('renders its children', () => {
    const container = mount(() => (
      <LeaderboardList>
        <div data-row="a" />
        <div data-row="b" />
      </LeaderboardList>
    ))
    expect(container.innerHTML).toContain('data-row="a"')
    expect(container.innerHTML).toContain('data-row="b"')
  })

  it('renders the title and actions when present and omits the header otherwise', () => {
    const withHeader = mount(() => (
      <LeaderboardList title="Top players" actions={<button type="button" data-actions="" />}>
        <div data-row="" />
      </LeaderboardList>
    ))
    expect(withHeader.innerHTML).toContain('Top players')
    expect(withHeader.innerHTML).toContain('data-actions')
    const without = mount(() => (
      <LeaderboardList>
        <div data-row="" />
      </LeaderboardList>
    ))
    expect(without.querySelector('header')).toBeNull()
  })

  it('renders the emptyState when there are no children', () => {
    const container = mount(() => <LeaderboardList emptyState={<p data-empty="">No entries</p>} />)
    expect(container.innerHTML).toContain('data-empty=""')
    expect(container.innerHTML).toContain('No entries')
  })

  it('forwards className', () => {
    const container = mount(() => (
      <LeaderboardList className="ll-cls">
        <div data-row="" />
      </LeaderboardList>
    ))
    expect(container.innerHTML).toContain('ll-cls')
  })

  it('counts rows added through a <For> and shows the empty state when it shrinks to none', () => {
    const [rows, setRows] = createSignal<string[]>([])
    const container = mount(() => (
      <LeaderboardList emptyState={<p data-empty="">No entries</p>}>
        <For each={rows()}>{(row) => <div data-row={row}>{row}</div>}</For>
      </LeaderboardList>
    ))
    expect(container.querySelector('[data-empty]')).not.toBeNull()

    setRows(['a', 'b'])
    expect(container.querySelectorAll('[data-row]')).toHaveLength(2)
    expect(container.querySelector('[data-empty]')).toBeNull()

    setRows(['a'])
    expect(container.querySelectorAll('[data-row]')).toHaveLength(1)

    setRows([])
    expect(container.querySelector('[data-empty]')).not.toBeNull()
  })
})
