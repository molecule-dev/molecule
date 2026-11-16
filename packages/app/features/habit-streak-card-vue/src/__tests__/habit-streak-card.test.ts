// @vitest-environment jsdom
/**
 * Unit tests for the Vue `HabitStreakCard` — a port of
 * `@molecule/app-habit-streak-card-react/src/__tests__/habit-streak-card.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

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

vi.mock('@molecule/app-vue', () => ({
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

vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Card: defineComponent({
      name: 'Card',
      props: { className: String },
      setup(props, { slots }) {
        return () => h('div', { 'data-card': '', class: props.className }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

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
 * @param slots - Same-named slots, when the test mounts with slots.
 * @returns The markup.
 */
const render = (
  props: HabitStreakCardProps,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(HabitStreakCard, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('HabitStreakCard', () => {
  it('renders the habit name in an <h3> and the current streak', () => {
    const markup = render({ name: 'Meditate', currentStreak: 7 })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Meditate')
    expect(markup).toContain('7')
    expect(markup).toContain('day streak')
  })

  it('renders the icon slot', () => {
    const markup = render({
      name: 'M',
      currentStreak: 1,
      icon: h('span', { 'data-icon': '' }),
    })
    expect(markup).toContain('data-icon=""')
  })

  it('renders best streak and total completions when present and omits them otherwise', () => {
    const full = render({ name: 'M', currentStreak: 5, bestStreak: 30, totalCompletions: 120 })
    expect(full).toContain('30')
    expect(full).toContain('best')
    expect(full).toContain('120')
    expect(full).toContain('total')
    const bare = render({ name: 'M', currentStreak: 5 })
    expect(bare).not.toContain('best')
    expect(bare).not.toContain('total')
  })

  it('renders a heatmap square per day when a heatmap is supplied', () => {
    const markup = render({
      name: 'M',
      currentStreak: 2,
      heatmap: [
        { date: '2026-05-01', count: 0 },
        { date: '2026-05-02', count: 3 },
      ],
    })
    expect(markup).toContain('aria-label="2026-05-01: 0"')
    expect(markup).toContain('aria-label="2026-05-02: 3"')
  })

  it('gives the heatmap strip a group role and each day square an img role', () => {
    const markup = render({
      name: 'M',
      currentStreak: 2,
      heatmap: [
        { date: '2026-05-01', count: 0 },
        { date: '2026-05-02', count: 3 },
      ],
    })
    // The strip is a named group; each square is a named image, which lets
    // aria-label and title stay on them (axe's aria-prohibited-attr).
    expect(markup).toMatch(/<div[^>]*role="group"[^>]*aria-label="Recent activity"/)
    expect(markup).toMatch(/<span[^>]*role="img"[^>]*aria-label="2026-05-01: 0"/)
    expect(markup).toMatch(/<span[^>]*role="img"[^>]*title="2026-05-02: 3"/)
  })

  it('truncates the heatmap to the heatmapDays window from the end', () => {
    const markup = render({
      name: 'M',
      currentStreak: 1,
      heatmapDays: 2,
      heatmap: [
        { date: 'd1', count: 1 },
        { date: 'd2', count: 1 },
        { date: 'd3', count: 1 },
      ],
    })
    expect(markup).not.toContain('aria-label="d1')
    expect(markup).toContain('aria-label="d2: 1"')
    expect(markup).toContain('aria-label="d3: 1"')
  })

  it('forwards className onto the Card', () => {
    const markup = render({ name: 'M', currentStreak: 1, className: 'hsc-cls' })
    expect(markup).toContain('hsc-cls')
  })
})
