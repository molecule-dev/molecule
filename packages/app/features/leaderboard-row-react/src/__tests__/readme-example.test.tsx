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

import { LeaderboardRow } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered standings.
 */
function WeeklyStandings(): React.JSX.Element {
  const currentUserId = 'u2'
  const standings = [
    { id: 'u1', rank: 1, name: 'Alice Chen', team: 'Team Phoenix', points: 4820, delta: 2 },
    { id: 'u2', rank: 2, name: 'Bo Diaz', team: 'Team Orion', points: 4515, delta: -1 },
    { id: 'u3', rank: 5, name: 'Cam Rivera', team: 'Team Phoenix', points: 3990, delta: 0 },
  ]
  return (
    <div>
      {standings.map((s) => (
        <LeaderboardRow
          key={s.id}
          rank={s.rank}
          name={s.name}
          subtitle={s.team}
          score={`${s.points.toLocaleString('en-US')} pts`}
          rankDelta={s.delta}
          isMe={s.id === currentUserId}
        />
      ))}
    </div>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders medals, #rank, deltas, and highlights only the current user', () => {
    const html = renderToStaticMarkup(<WeeklyStandings />)
    expect(html).toContain('🥇')
    expect(html).toContain('🥈')
    expect(html).toContain('#5')
    expect(html).toContain('Team Orion')
    expect(html).toContain('4,820 pts')
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    expect(text).toContain('▲ 2')
    expect(text).toContain('▼ 1')
    expect(text.match(/[▲▼]/g)).toHaveLength(2)
    expect(html.match(/rgba\(96,165,250,0\.1\)/g)).toHaveLength(1)
  })
})
