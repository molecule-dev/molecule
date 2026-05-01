/**
 * Unit tests for `<LoyaltyTierBadge>` and its progress helpers.
 *
 * @module
 */

// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
    fontWeight: () => 'fw',
  }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let s = opts?.defaultValue ?? _key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

import { computeProgress, LoyaltyTierBadge, nextTierOf } from '../LoyaltyTierBadge.js'

afterEach(() => {
  cleanup()
})

describe('helpers', () => {
  it('returns 0 progress when no points/threshold are passed', () => {
    expect(computeProgress()).toBe(0)
    expect(computeProgress(100)).toBe(0)
    expect(computeProgress(undefined, 1000)).toBe(0)
  })

  it('clamps progress to [0, 1]', () => {
    expect(computeProgress(-5, 100)).toBe(0)
    expect(computeProgress(50, 100)).toBe(0.5)
    expect(computeProgress(150, 100)).toBe(1)
  })

  it('protects against zero / negative thresholds', () => {
    expect(computeProgress(50, 0)).toBe(0)
    expect(computeProgress(50, -5)).toBe(0)
  })

  it('walks the tier ladder correctly', () => {
    expect(nextTierOf('bronze')).toBe('silver')
    expect(nextTierOf('silver')).toBe('gold')
    expect(nextTierOf('gold')).toBe('platinum')
    expect(nextTierOf('platinum')).toBe(null)
  })
})

describe('<LoyaltyTierBadge>', () => {
  it('renders the tier label by default ("Bronze", "Silver", …)', () => {
    const { rerender } = render(<LoyaltyTierBadge tier="bronze" />)
    expect(screen.getByText('Bronze')).toBeDefined()
    rerender(<LoyaltyTierBadge tier="silver" />)
    expect(screen.getByText('Silver')).toBeDefined()
    rerender(<LoyaltyTierBadge tier="gold" />)
    expect(screen.getByText('Gold')).toBeDefined()
    rerender(<LoyaltyTierBadge tier="platinum" />)
    expect(screen.getByText('Platinum')).toBeDefined()
  })

  it('exposes data-tier for downstream styling and tests', () => {
    const { container } = render(<LoyaltyTierBadge tier="silver" />)
    expect(container.querySelector('[data-tier="silver"]')).not.toBeNull()
  })

  it('hides the progress bar when no points/threshold are supplied', () => {
    const { container } = render(<LoyaltyTierBadge tier="silver" />)
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('renders a progressbar with the correct aria-valuenow', () => {
    const { container } = render(
      <LoyaltyTierBadge tier="silver" points={300} nextTierThreshold={1000} />,
    )
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement
    expect(bar).not.toBeNull()
    expect(bar.getAttribute('aria-valuenow')).toBe('30')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
  })

  it('renders the "X to next tier" remaining label', () => {
    render(<LoyaltyTierBadge tier="silver" points={300} nextTierThreshold={1000} />)
    expect(screen.getByText('700 to Gold')).toBeDefined()
  })

  it('honors a custom nextTierLabel', () => {
    render(
      <LoyaltyTierBadge
        tier="gold"
        points={50000}
        nextTierThreshold={100000}
        nextTierLabel="Diamond"
      />,
    )
    expect(screen.getByText('50000 to Diamond')).toBeDefined()
  })

  it('shows the "top tier" message at platinum with no progress', () => {
    render(<LoyaltyTierBadge tier="platinum" />)
    expect(screen.getByText('Top tier reached')).toBeDefined()
  })

  it('does NOT render a progressbar at platinum even with points provided', () => {
    const { container } = render(
      <LoyaltyTierBadge tier="platinum" points={5000} nextTierThreshold={10000} />,
    )
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('honors an explicit tierLabel override', () => {
    render(<LoyaltyTierBadge tier="gold" tierLabel="VIP" />)
    expect(screen.getByText('VIP')).toBeDefined()
  })

  it('forwards dataMolId for agent automation', () => {
    const { container } = render(<LoyaltyTierBadge dataMolId="account-tier" tier="gold" />)
    expect(container.querySelector('[data-mol-id="account-tier"]')).not.toBeNull()
  })

  it('exposes role="group" with a translated aria-label', () => {
    render(<LoyaltyTierBadge tier="gold" />)
    const grp = screen.getByRole('group')
    expect(grp.getAttribute('aria-label')).toBe('Gold tier')
  })
})
