/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { HabitStreakCard, type StreakDay } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered habit card.
 */
function MorningRunWidget(): React.JSX.Element {
  const recentDays: StreakDay[] = [
    { date: '2026-07-01', count: 0 },
    { date: '2026-07-02', count: 1 },
    { date: '2026-07-03', count: 3 },
  ]
  return (
    <HabitStreakCard
      name="Morning Run"
      icon={<span aria-hidden="true">🏃</span>}
      currentStreak={14}
      bestStreak={30}
      totalCompletions={87}
      heatmap={recentDays}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders the name, the three stats and one heatmap square per day', () => {
    const html = renderToStaticMarkup(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <MorningRunWidget />
      </I18nProvider>,
    )
    expect(html).toContain('Morning Run')
    expect(html).toContain('>14<')
    expect(html).toContain('day streak')
    expect(html).toContain('>30<')
    expect(html).toContain('>87<')
    expect(html).toContain('aria-label="2026-07-01: 0"')
    expect(html).toContain('aria-label="2026-07-03: 3"')
    expect(html.match(/title="2026-07-0\d: \d"/g)).toHaveLength(3)
    expect(html).toContain('background:rgba(34,197,94,1)')
  })
})
