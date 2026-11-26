// @vitest-environment jsdom
/**
 * Every string the Vue `HabitStreakCard` writes itself goes through i18n — a
 * port of `@molecule/app-habit-streak-card-react/src/__tests__/habit-streak-card-i18n.test.tsx`:
 * the same test names and assertions. The bonded provider's `t` is mocked to a
 * marker (`«key»`), so a label that bypassed `t()` would show up as plain
 * English.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React suite uses.
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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Card: defineComponent({
      name: 'Card',
      props: { className: String },
      setup(props, { slots }) {
        return () => h('div', { 'data-card': '', class: props.className }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h } from 'vue'

import { HabitStreakCard } from '../HabitStreakCard.js'
import type { HabitStreakCardProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts a {@link HabitStreakCard} with the given props and returns the markup
 * it produced.
 *
 * @param props - The card's props.
 * @returns The markup.
 */
const render = (props: HabitStreakCardProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(HabitStreakCard, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('HabitStreakCard i18n', () => {
  it('takes the heatmap strip label through i18n by default', () => {
    const markup = render({
      name: 'M',
      currentStreak: 2,
      heatmap: [
        { date: '2026-05-01', count: 1 },
        { date: '2026-05-02', count: 2 },
      ],
    })
    expect(markup).toContain('aria-label="«habit.aria.recentActivity»"')
  })

  it('takes each heatmap day label through i18n by default', () => {
    const markup = render({
      name: 'M',
      currentStreak: 2,
      heatmap: [
        { date: '2026-05-01', count: 0 },
        { date: '2026-05-02', count: 3 },
      ],
    })
    // The one day-label key feeds both the announced label and the tooltip.
    expect(markup).toContain('aria-label="«habit.cell.tooltip»"')
    expect(markup).toContain('title="«habit.cell.tooltip»"')
    expect(markup).not.toContain('aria-label="2026-05-01: 0"')
    expect(markup).not.toContain('title="2026-05-02: 3"')
  })
})
