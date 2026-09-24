/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { LeaderboardRow } from '@molecule/app-leaderboard-row-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { LeaderboardList } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered leaderboard.
 */
function TopContributors(): React.JSX.Element {
  const entries = [
    { id: 'u1', rank: 1, name: 'Alice Chen', score: 4820 },
    { id: 'u2', rank: 2, name: 'Bo Diaz', score: 4515 },
    { id: 'u3', rank: 4, name: 'Cam Rivera', score: 3990 },
  ]
  return (
    <LeaderboardList title="Top Contributors" emptyState={<p>No scores yet.</p>}>
      {entries.map((e) => (
        <LeaderboardRow
          key={e.id}
          rank={e.rank}
          name={e.name}
          score={e.score.toLocaleString('en-US')}
        />
      ))}
    </LeaderboardList>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders the title and one row per entry with medals for the podium', () => {
    const html = renderToStaticMarkup(<TopContributors />)
    expect(html).toContain('<h3')
    expect(html).toContain('Top Contributors')
    expect(html).toContain('🥇')
    expect(html).toContain('🥈')
    expect(html).toContain('#4')
    expect(html).toContain('Alice Chen')
    expect(html).toContain('4,820')
    expect(html).toContain('3,990')
    expect(html).not.toContain('No scores yet.')
  })
})
