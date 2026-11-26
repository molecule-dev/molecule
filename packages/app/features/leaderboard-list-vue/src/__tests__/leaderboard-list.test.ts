// @vitest-environment jsdom
/**
 * Unit tests for the Vue `LeaderboardList` — a port of
 * `@molecule/app-leaderboard-list-react/src/__tests__/leaderboard-list.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

const { LeaderboardList } = await import('../LeaderboardList.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link LeaderboardList} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(LeaderboardList, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('LeaderboardList', () => {
  it('renders its children', () => {
    const markup = render(
      {},
      {
        default: () => [
          h('div', { key: 'a', 'data-row': 'a' }),
          h('div', { key: 'b', 'data-row': 'b' }),
        ],
      },
    )
    expect(markup).toContain('data-row="a"')
    expect(markup).toContain('data-row="b"')
  })

  it('renders the title and actions when present and omits the header otherwise', () => {
    const withHeader = render(
      {},
      {
        default: () => [h('div', { 'data-row': '' })],
        title: () => ['Top players'],
        actions: () => [h('button', { 'data-actions': '', type: 'button' })],
      },
    )
    expect(withHeader).toContain('Top players')
    expect(withHeader).toContain('data-actions')
    const without = render({}, { default: () => [h('div', { 'data-row': '' })] })
    expect(without).not.toContain('<header')
  })

  it('renders the emptyState when there are no children', () => {
    const markup = render({}, { emptyState: () => [h('p', { 'data-empty': '' }, 'No entries')] })
    expect(markup).toContain('data-empty=""')
    expect(markup).toContain('No entries')
  })

  it('forwards className', () => {
    const markup = render(
      { className: 'll-cls' },
      { default: () => [h('div', { 'data-row': '' })] },
    )
    expect(markup).toContain('ll-cls')
  })
})
