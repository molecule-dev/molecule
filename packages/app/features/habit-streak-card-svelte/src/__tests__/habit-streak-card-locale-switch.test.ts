// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Svelte `HabitStreakCard`'s heatmap labels —
 * a port of
 * `@molecule/app-habit-streak-card-react/src/__tests__/habit-streak-card-locale-switch.test.tsx`:
 * the same test name and assertion. The component reads `t` while its markup
 * evaluates, which re-runs when the provider changes, so a switch re-renders
 * the text. This test bonds a provider with an `en` and a `fr` value for the
 * strip label and the day tooltip the component renders, renders it in `en`,
 * switches to `fr`, and asserts the DOM now shows the French values (the day
 * tooltip re-interpolated with the same date and count).
 *
 * @module
 */

import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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

// The real `@molecule/app-ui-svelte` Card renders against the mocked ClassMap
// above and the bonded i18n provider below.

import HabitStreakCard from '../HabitStreakCard.svelte'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: {
        'habit.aria.recentActivity': 'Recent activity',
        'habit.cell.tooltip': '{{date}}: {{count}}',
      },
    },
    {
      code: 'fr',
      name: 'French',
      translations: {
        'habit.aria.recentActivity': 'Activité récente',
        'habit.cell.tooltip': '{{date}} : {{count}}',
      },
    },
  ])
  setProvider(provider)
})

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts `HabitStreakCard` with the given props.
 *
 * @param props - The card's props.
 * @returns The host element.
 */
const render = (props: ComponentProps<typeof HabitStreakCard>): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(HabitStreakCard, { target, props })
  mounted.push(instance)
  return target
}

describe('HabitStreakCard locale switch', () => {
  it('renders the heatmap labels in French after setLocale', async () => {
    const target = render({
      name: 'M',
      currentStreak: 2,
      heatmap: [
        { date: '2026-05-01', count: 0 },
        { date: '2026-05-02', count: 3 },
      ],
    })
    const strip = () => target.querySelector('[aria-label]')!
    expect(strip().getAttribute('aria-label')).toBe('Recent activity')
    expect(target.querySelector('span[title="2026-05-01: 0"]')).not.toBeNull()

    // The switch itself: the component must re-render in French.
    await provider.setLocale('fr')
    flushSync()

    expect(strip().getAttribute('aria-label')).toBe('Activité récente')
    expect(target.querySelector('span[title="2026-05-01 : 0"]')).not.toBeNull()
    expect(target.querySelector('span[title="2026-05-02 : 3"]')).not.toBeNull()
    expect(target.querySelector('span[title="2026-05-01: 0"]')).toBeNull()
  })
})
