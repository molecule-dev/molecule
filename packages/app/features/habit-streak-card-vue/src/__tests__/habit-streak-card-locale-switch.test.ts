// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Vue `HabitStreakCard`'s heatmap labels — a
 * port of
 * `@molecule/app-habit-streak-card-react/src/__tests__/habit-streak-card-locale-switch.test.tsx`:
 * the same test name and assertion. `useTranslation()` from `@molecule/app-vue`
 * subscribes to the provider, so the component re-renders on the switch. This
 * test bonds a provider with an `en` and a `fr` value for the strip label and
 * the day tooltip the component renders, renders it in `en`, switches to `fr`,
 * and asserts the DOM now shows the French values (the day tooltip
 * re-interpolated with the same date and count).
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

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

import { HabitStreakCard } from '../HabitStreakCard.js'

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

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('HabitStreakCard locale switch', () => {
  it('renders the heatmap labels in French after setLocale', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({
        render: () =>
          h(HabitStreakCard, {
            name: 'M',
            currentStreak: 2,
            heatmap: [
              { date: '2026-05-01', count: 0 },
              { date: '2026-05-02', count: 3 },
            ],
          }),
      }),
    )
    app.mount(host)
    const strip = () => host.querySelector('[aria-label]')!
    expect(strip().getAttribute('aria-label')).toBe('Recent activity')
    expect(host.querySelector('span[title="2026-05-01: 0"]')).not.toBeNull()

    // The switch itself: the component must re-render in French.
    await provider.setLocale('fr')
    await nextTick()

    expect(strip().getAttribute('aria-label')).toBe('Activité récente')
    expect(host.querySelector('span[title="2026-05-01 : 0"]')).not.toBeNull()
    expect(host.querySelector('span[title="2026-05-02 : 3"]')).not.toBeNull()
    expect(host.querySelector('span[title="2026-05-01: 0"]')).toBeNull()
  })
})
