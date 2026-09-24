// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type LoyaltyTier, LoyaltyTierBadge } from '../index.js'

// Program rules: points needed to REACH each tier.
const THRESHOLDS: Record<LoyaltyTier, number> = {
  bronze: 0,
  silver: 10_000,
  gold: 25_000,
  platinum: 75_000,
}
const ORDER: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum']

/**
 * The README example, verbatim.
 *
 * @param props - Component props.
 * @param props.points - Member's points balance.
 * @returns The member's tier badge.
 */
function MemberStatus({ points }: { points: number }): React.JSX.Element {
  const tier = [...ORDER].reverse().find((t) => points >= THRESHOLDS[t]) ?? 'bronze'
  const next = ORDER[ORDER.indexOf(tier) + 1]
  return (
    <LoyaltyTierBadge
      tier={tier}
      points={points}
      nextTierThreshold={next ? THRESHOLDS[next] : undefined}
      dataMolId="member-tier"
    />
  )
}

/**
 * Renders the example inside the i18n provider the component requires.
 *
 * @param points - Points balance.
 * @returns The testing-library render result.
 */
function renderStatus(points: number): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <MemberStatus points={points} />
    </I18nProvider>,
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('shows Gold with a 56% bar and the remaining points to Platinum', () => {
    const view = renderStatus(42_000)
    const group = view.getByRole('group', { name: 'Gold tier' })
    expect(group.getAttribute('data-mol-id')).toBe('member-tier')
    expect(group.getAttribute('data-tier')).toBe('gold')
    const bar = view.getByRole('progressbar', { name: 'Progress to Platinum' })
    expect(bar.getAttribute('aria-valuenow')).toBe('56')
    expect(view.getByText('33000 to Platinum')).toBeTruthy()
  })

  it('shows the top-tier message at platinum', () => {
    const view = renderStatus(80_000)
    expect(view.getByRole('group', { name: 'Platinum tier' })).toBeTruthy()
    expect(view.queryByRole('progressbar')).toBeNull()
    expect(view.getByText('Top tier reached')).toBeTruthy()
  })
})
