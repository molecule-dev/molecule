// @vitest-environment jsdom
/**
 * Literal-key test for the Solid `LoyaltyTierBadge`: the `t` provider returns
 * the key itself, so every visible label proves the component translates
 * through one literal key per value (never a key built at runtime). A 1:1
 * port of the React package's `LoyaltyTierBadgeKeys.test.tsx`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
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

const { LoyaltyTierBadge } = await import('../index.js')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders a view with Solid's browser renderer and disposes it after the test.
 *
 * @param view - The view to render.
 * @returns The container element.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('translated tier names come from literal keys', () => {
  it('renders each tier through its literal key', () => {
    expect(mount(() => <LoyaltyTierBadge tier="bronze" />).textContent).toContain(
      'loyaltyTierBadge.tier.bronze',
    )
    expect(mount(() => <LoyaltyTierBadge tier="silver" />).textContent).toContain(
      'loyaltyTierBadge.tier.silver',
    )
    expect(mount(() => <LoyaltyTierBadge tier="gold" />).textContent).toContain(
      'loyaltyTierBadge.tier.gold',
    )
    expect(mount(() => <LoyaltyTierBadge tier="platinum" />).textContent).toContain(
      'loyaltyTierBadge.tier.platinum',
    )
  })

  it('renders the next tier through its literal key', () => {
    const container = mount(() => (
      <LoyaltyTierBadge tier="gold" points={50000} nextTierThreshold={100000} />
    ))
    // The next tier after gold is platinum; the label can only come from the
    // next-tier call, since the current tier's own call reads `tier.gold`.
    expect(container.textContent).toContain('next=loyaltyTierBadge.tier.platinum')
  })

  it('keeps the fixed labels on their literal keys', () => {
    const container = mount(() => (
      <LoyaltyTierBadge tier="silver" points={300} nextTierThreshold={1000} />
    ))
    expect(container.textContent).toContain('loyaltyTierBadge.remaining (')
    expect(container.querySelector('[role="progressbar"]')?.getAttribute('aria-label')).toBe(
      'loyaltyTierBadge.progress (next=loyaltyTierBadge.tier.gold)',
    )
    expect(container.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
      'loyaltyTierBadge.group (tier=loyaltyTierBadge.tier.silver)',
    )

    const top = mount(() => <LoyaltyTierBadge tier="platinum" />)
    expect(top.textContent).toContain('loyaltyTierBadge.topTier')
  })
})
