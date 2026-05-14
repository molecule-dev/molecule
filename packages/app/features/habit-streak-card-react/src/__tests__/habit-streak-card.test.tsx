import { createElement } from 'react'
import type { ReactNode } from 'react'
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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Card: ({ children, className }: { children?: ReactNode; className?: string }) =>
    createElement('div', { 'data-card': '', className }, children),
}))

const { HabitStreakCard } = await import('../HabitStreakCard.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('HabitStreakCard', () => {
  it('renders the habit name in an <h3> and the current streak', () => {
    const markup = html(createElement(HabitStreakCard, { name: 'Meditate', currentStreak: 7 }))
    expect(markup).toContain('<h3')
    expect(markup).toContain('Meditate')
    expect(markup).toContain('7')
    expect(markup).toContain('day streak')
  })

  it('renders the icon slot', () => {
    const markup = html(
      createElement(HabitStreakCard, {
        name: 'M',
        currentStreak: 1,
        icon: createElement('span', { 'data-icon': '' }),
      }),
    )
    expect(markup).toContain('data-icon=""')
  })

  it('renders best streak and total completions when present and omits them otherwise', () => {
    const full = html(
      createElement(HabitStreakCard, {
        name: 'M',
        currentStreak: 5,
        bestStreak: 30,
        totalCompletions: 120,
      }),
    )
    expect(full).toContain('30')
    expect(full).toContain('best')
    expect(full).toContain('120')
    expect(full).toContain('total')
    const bare = html(createElement(HabitStreakCard, { name: 'M', currentStreak: 5 }))
    expect(bare).not.toContain('best')
    expect(bare).not.toContain('total')
  })

  it('renders a heatmap square per day when a heatmap is supplied', () => {
    const markup = html(
      createElement(HabitStreakCard, {
        name: 'M',
        currentStreak: 2,
        heatmap: [
          { date: '2026-05-01', count: 0 },
          { date: '2026-05-02', count: 3 },
        ],
      }),
    )
    expect(markup).toContain('aria-label="2026-05-01: 0"')
    expect(markup).toContain('aria-label="2026-05-02: 3"')
  })

  it('truncates the heatmap to the heatmapDays window from the end', () => {
    const markup = html(
      createElement(HabitStreakCard, {
        name: 'M',
        currentStreak: 1,
        heatmapDays: 2,
        heatmap: [
          { date: 'd1', count: 1 },
          { date: 'd2', count: 1 },
          { date: 'd3', count: 1 },
        ],
      }),
    )
    expect(markup).not.toContain('aria-label="d1')
    expect(markup).toContain('aria-label="d2: 1"')
    expect(markup).toContain('aria-label="d3: 1"')
  })

  it('forwards className onto the Card', () => {
    const markup = html(
      createElement(HabitStreakCard, { name: 'M', currentStreak: 1, className: 'hsc-cls' }),
    )
    expect(markup).toContain('hsc-cls')
  })
})
