import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name; `cn` joins the strings it is given — the
// same mock the main suite uses.
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
// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))
vi.mock('@molecule/app-ui-react', () => ({
  Card: ({ children, className }: { children?: ReactNode; className?: string }) =>
    createElement('div', { 'data-card': '', className }, children),
}))

const { HabitStreakCard } = await import('../HabitStreakCard.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('HabitStreakCard i18n', () => {
  it('takes the heatmap strip label through i18n by default', () => {
    const markup = html(
      createElement(HabitStreakCard, {
        name: 'M',
        currentStreak: 2,
        heatmap: [
          { date: '2026-05-01', count: 1 },
          { date: '2026-05-02', count: 2 },
        ],
      }),
    )
    expect(markup).toContain('aria-label="«habit.aria.recentActivity»"')
  })

  it('takes each heatmap day label through i18n by default', () => {
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
    // The one day-label key feeds both the announced label and the tooltip.
    expect(markup).toContain('aria-label="«habit.cell.tooltip»"')
    expect(markup).toContain('title="«habit.cell.tooltip»"')
    expect(markup).not.toContain('aria-label="2026-05-01: 0"')
    expect(markup).not.toContain('title="2026-05-02: 3"')
  })
})
