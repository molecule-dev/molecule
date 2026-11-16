// @vitest-environment jsdom
/**
 * Unit tests for the Solid `HabitStreakCard` — a port of
 * `@molecule/app-habit-streak-card-react/src/__tests__/habit-streak-card.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    // The provider's contract: the inline English default, `{{placeholders}}`
    // filled from `values`.
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      const base = opts?.defaultValue ?? key
      if (!values) return base
      return base.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) =>
        k in values ? String(values[k]) : m,
      )
    },
  }),
}))

vi.mock('@molecule/app-ui-solid', () => ({
  Card: (props: { children?: JSX.Element; className?: string }) => (
    <div data-card="" class={props.className}>
      {props.children}
    </div>
  ),
}))

const { HabitStreakCard } = await import('../HabitStreakCard.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders a view with Solid's browser renderer and returns the wrapper element.
 *
 * @param view - The view to render.
 * @returns The wrapper element.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('HabitStreakCard', () => {
  it('renders the habit name in an <h3> and the current streak', () => {
    const markup = mount(() => <HabitStreakCard name="Meditate" currentStreak={7} />).innerHTML
    expect(markup).toContain('<h3')
    expect(markup).toContain('Meditate')
    expect(markup).toContain('7')
    expect(markup).toContain('day streak')
  })

  it('renders the icon slot', () => {
    const markup = mount(() => (
      <HabitStreakCard name="M" currentStreak={1} icon={<span data-icon="" />} />
    )).innerHTML
    expect(markup).toContain('data-icon=""')
  })

  it('renders best streak and total completions when present and omits them otherwise', () => {
    const full = mount(() => (
      <HabitStreakCard name="M" currentStreak={5} bestStreak={30} totalCompletions={120} />
    )).innerHTML
    expect(full).toContain('30')
    expect(full).toContain('best')
    expect(full).toContain('120')
    expect(full).toContain('total')
    const bare = mount(() => <HabitStreakCard name="M" currentStreak={5} />).innerHTML
    expect(bare).not.toContain('best')
    expect(bare).not.toContain('total')
  })

  it('renders a heatmap square per day when a heatmap is supplied', () => {
    const markup = mount(() => (
      <HabitStreakCard
        name="M"
        currentStreak={2}
        heatmap={[
          { date: '2026-05-01', count: 0 },
          { date: '2026-05-02', count: 3 },
        ]}
      />
    )).innerHTML
    expect(markup).toContain('aria-label="2026-05-01: 0"')
    expect(markup).toContain('aria-label="2026-05-02: 3"')
  })

  it('gives the heatmap strip a group role and each day square an img role', () => {
    const markup = mount(() => (
      <HabitStreakCard
        name="M"
        currentStreak={2}
        heatmap={[
          { date: '2026-05-01', count: 0 },
          { date: '2026-05-02', count: 3 },
        ]}
      />
    )).innerHTML
    // The strip is a named group; each square is a named image, which lets
    // aria-label and title stay on them (axe's aria-prohibited-attr).
    expect(markup).toMatch(/<div[^>]*role="group"[^>]*aria-label="Recent activity"/)
    expect(markup).toMatch(/<span[^>]*role="img"[^>]*aria-label="2026-05-01: 0"/)
    expect(markup).toMatch(/<span[^>]*role="img"[^>]*title="2026-05-02: 3"/)
  })

  it('truncates the heatmap to the heatmapDays window from the end', () => {
    const markup = mount(() => (
      <HabitStreakCard
        name="M"
        currentStreak={1}
        heatmapDays={2}
        heatmap={[
          { date: 'd1', count: 1 },
          { date: 'd2', count: 1 },
          { date: 'd3', count: 1 },
        ]}
      />
    )).innerHTML
    expect(markup).not.toContain('aria-label="d1')
    expect(markup).toContain('aria-label="d2: 1"')
    expect(markup).toContain('aria-label="d3: 1"')
  })

  it('forwards className onto the Card', () => {
    const markup = mount(() => (
      <HabitStreakCard name="M" currentStreak={1} className="hsc-cls" />
    )).innerHTML
    expect(markup).toContain('hsc-cls')
  })
})
