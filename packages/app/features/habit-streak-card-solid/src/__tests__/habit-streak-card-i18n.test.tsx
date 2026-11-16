// @vitest-environment jsdom
/**
 * Every string the Solid `HabitStreakCard` writes itself goes through i18n — a
 * port of
 * `@molecule/app-habit-streak-card-react/src/__tests__/habit-streak-card-i18n.test.tsx`:
 * the same test names and assertions. The bonded provider's `t` is mocked to a
 * marker (`«key»`), so a label that bypassed `t()` would show up as plain
 * English.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React suite uses.
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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
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

describe('HabitStreakCard i18n', () => {
  it('takes the heatmap strip label through i18n by default', () => {
    const markup = mount(() => (
      <HabitStreakCard
        name="M"
        currentStreak={2}
        heatmap={[
          { date: '2026-05-01', count: 1 },
          { date: '2026-05-02', count: 2 },
        ]}
      />
    )).innerHTML
    expect(markup).toContain('aria-label="«habit.aria.recentActivity»"')
  })

  it('takes each heatmap day label through i18n by default', () => {
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
    // The one day-label key feeds both the announced label and the tooltip.
    expect(markup).toContain('aria-label="«habit.cell.tooltip»"')
    expect(markup).toContain('title="«habit.cell.tooltip»"')
    expect(markup).not.toContain('aria-label="2026-05-01: 0"')
    expect(markup).not.toContain('title="2026-05-02: 3"')
  })
})
