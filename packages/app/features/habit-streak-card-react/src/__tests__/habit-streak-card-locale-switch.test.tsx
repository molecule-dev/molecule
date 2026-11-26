// @vitest-environment jsdom
/**
 * Locale-switch reactivity for HabitStreakCard's heatmap labels.
 *
 * `useTranslation()` from `@molecule/app-react` subscribes through
 * `useSyncExternalStore`, so a component reading `t` from the hook re-renders
 * on the switch. This test bonds a provider with an `en` and a `fr` value for
 * the strip label and the day tooltip the component renders, renders it in
 * `en`, switches to `fr` through `act`, and asserts the DOM now shows the
 * French values (the day tooltip re-interpolated with the same date and count).
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// Class tokens echo their own name; `cn` joins the strings it is given.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) =>
                cls
                  .flat(Infinity)
                  .map((c) => (typeof c === 'function' ? c() : c))
                  .filter((c) => typeof c === 'string' && c.length > 0)
                  .join(' ')
            : () => String(prop),
      },
    ),
}))
vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Card: ({ children, className }: { children?: ReactNode; className?: string }) =>
    createElement('div', { 'data-card': '', className }, children),
}))

const { HabitStreakCard } = await import('../HabitStreakCard.js')

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
  cleanup()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('HabitStreakCard locale switch', () => {
  it('renders the heatmap labels in French after setLocale', async () => {
    const { container } = render(
      createElement(HabitStreakCard, {
        name: 'M',
        currentStreak: 2,
        heatmap: [
          { date: '2026-05-01', count: 0 },
          { date: '2026-05-02', count: 3 },
        ],
      }),
    )
    const strip = () => container.querySelector('[aria-label]')
    expect(strip()?.getAttribute('aria-label')).toBe('Recent activity')
    expect(container.querySelector('span[title="2026-05-01: 0"]')).not.toBeNull()

    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(strip()?.getAttribute('aria-label')).toBe('Activité récente')
    expect(container.querySelector('span[title="2026-05-01 : 0"]')).not.toBeNull()
    expect(container.querySelector('span[title="2026-05-02 : 3"]')).not.toBeNull()
    expect(container.querySelector('span[title="2026-05-01: 0"]')).toBeNull()
  })
})
