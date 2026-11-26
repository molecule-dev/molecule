/**
 * Literal-key test for `<LoyaltyTierBadge>`: the `t` provider returns the key
 * itself, so every visible label proves the component translates through one
 * literal key per value (never a key built at runtime). Ported 1:1 in the
 * Vue / Solid / Svelte / Angular packages.
 *
 * @module
 */

// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
    fontWeight: () => 'fw',
  }),
}))

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    // The marker is the key, with any interpolation values shown in
    // parentheses — so a value translated through a nested `t()` call (the
    // next tier's name) surfaces its own key in the rendered text.
    t: (key: string, values?: Record<string, unknown>) => {
      const shown = values
        ? Object.entries(values)
            .map(([k, v]) => `${k}=${String(v)}`)
            .join(', ')
        : ''
      return shown ? `${key} (${shown})` : key
    },
  }),
}))

import { LoyaltyTierBadge } from '../LoyaltyTierBadge.js'

afterEach(() => {
  cleanup()
})

describe('translated tier names come from literal keys', () => {
  it('renders each tier through its literal key', () => {
    const { rerender } = render(<LoyaltyTierBadge tier="bronze" />)
    expect(screen.getByText('loyaltyTierBadge.tier.bronze')).toBeDefined()
    rerender(<LoyaltyTierBadge tier="silver" />)
    expect(screen.getByText('loyaltyTierBadge.tier.silver')).toBeDefined()
    rerender(<LoyaltyTierBadge tier="gold" />)
    expect(screen.getByText('loyaltyTierBadge.tier.gold')).toBeDefined()
    rerender(<LoyaltyTierBadge tier="platinum" />)
    expect(screen.getByText('loyaltyTierBadge.tier.platinum')).toBeDefined()
  })

  it('renders the next tier through its literal key', () => {
    render(<LoyaltyTierBadge tier="gold" points={50000} nextTierThreshold={100000} />)
    // The next tier after gold is platinum; the label can only come from the
    // next-tier call, since the current tier's own call reads `tier.gold`.
    expect(screen.getByText(/next=loyaltyTierBadge\.tier\.platinum/)).toBeDefined()
  })

  it('keeps the fixed labels on their literal keys', () => {
    render(<LoyaltyTierBadge tier="silver" points={300} nextTierThreshold={1000} />)
    expect(screen.getByText(/loyaltyTierBadge\.remaining \(/)).toBeDefined()
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe(
      'loyaltyTierBadge.progress (next=loyaltyTierBadge.tier.gold)',
    )
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe(
      'loyaltyTierBadge.group (tier=loyaltyTierBadge.tier.silver)',
    )

    render(<LoyaltyTierBadge tier="platinum" />)
    expect(screen.getByText('loyaltyTierBadge.topTier')).toBeDefined()
  })
})
