// @vitest-environment jsdom
/**
 * Every string the Svelte `HabitStreakCard` writes itself goes through i18n —
 * a port of
 * `@molecule/app-habit-streak-card-react/src/__tests__/habit-streak-card-i18n.test.tsx`:
 * the same test names and assertions. The bonded provider's `t` is mocked to a
 * marker (`«key»`), so a label that bypassed `t()` would show up as plain
 * English.
 *
 * @module
 */

import { type ComponentProps, mount, unmount } from 'svelte'
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
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

// The real `@molecule/app-ui-svelte` Card renders against the mocked ClassMap
// and translations above — the same observable markup the React suite's Card
// mock produces (`aria-label` on the strip, `title` on each square).

import HabitStreakCard from '../HabitStreakCard.svelte'

// `mount()`'s Svelte 5 signature cannot be instantiated as a type argument
// (`typeof mount<Props>` has no applicable signature), so the instances the
// cleanup unmounts are held loosely.
const mounted: Array<Record<string, unknown>> = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Renders a `HabitStreakCard` with the given props, returning the host markup.
 *
 * @param props - The card's props.
 * @returns The markup.
 */
const render = (props: ComponentProps<typeof HabitStreakCard>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(HabitStreakCard, { target, props })
  mounted.push(instance)
  return target.innerHTML
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
