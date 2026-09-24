/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AchievementCard } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered achievements list.
 */
function AchievementsPage(): React.JSX.Element {
  const achievements = [
    {
      id: 'first-login',
      name: 'First Login',
      description: 'Signed in for the first time.',
      earned: true,
      earnedAt: 'Jan 3, 2025',
    },
    {
      id: 'streak-7',
      name: '7-Day Streak',
      description: 'Signed in 7 days in a row.',
      earned: false,
      progress: { value: 3, max: 7 },
    },
  ]
  return (
    <section>
      {achievements.map((a) => (
        <AchievementCard
          key={a.id}
          icon={<span aria-hidden="true">🏆</span>}
          name={a.name}
          description={a.description}
          earned={a.earned}
          earnedAt={a.earnedAt}
          progress={a.progress}
          tier="Common"
        />
      ))}
    </section>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders an earned card with its date and an in-progress card with a progress bar', () => {
    const html = renderToStaticMarkup(<AchievementsPage />)
    expect(html).toContain('First Login')
    expect(html).toContain('Signed in for the first time.')
    expect(html).toContain('Earned Jan 3, 2025')
    expect(html).toContain('7-Day Streak')
    expect(html).toContain('width:42.857142857142854%')
    expect(html).not.toContain('Locked')
    expect(html.match(/<h3/g)).toHaveLength(2)
    expect(html.match(/grayscale/g)).toHaveLength(1)
  })
})
