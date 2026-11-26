// @vitest-environment jsdom
/**
 * Literal-key test for `LoyaltyTierBadge`: the `t` provider returns the key
 * itself, so every visible label proves the component translates through one
 * literal key per value (never a key built at runtime). A 1:1 port of the
 * React package's `LoyaltyTierBadgeKeys.test.tsx`.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
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

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
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

import LoyaltyTierBadge from '../LoyaltyTierBadge.svelte'

const instances: unknown[] = []

afterEach(async () => {
  for (const instance of instances.splice(0))
    await unmount(instance as Parameters<typeof unmount>[0])
  document.body.innerHTML = ''
})

/**
 * Mounts a {@link LoyaltyTierBadge} and returns the target element it rendered
 * into.
 *
 * @param props - The badge props.
 * @returns The mount target.
 */
function render(props: Record<string, unknown>): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(LoyaltyTierBadge, { target, props: props as never })
  instances.push(instance)
  flushSync()
  return target
}

describe('translated tier names come from literal keys', () => {
  it('renders each tier through its literal key', () => {
    expect(render({ tier: 'bronze' }).textContent).toContain('loyaltyTierBadge.tier.bronze')
    expect(render({ tier: 'silver' }).textContent).toContain('loyaltyTierBadge.tier.silver')
    expect(render({ tier: 'gold' }).textContent).toContain('loyaltyTierBadge.tier.gold')
    expect(render({ tier: 'platinum' }).textContent).toContain('loyaltyTierBadge.tier.platinum')
  })

  it('renders the next tier through its literal key', () => {
    const target = render({ tier: 'gold', points: 50000, nextTierThreshold: 100000 })
    // The next tier after gold is platinum; the label can only come from the
    // next-tier call, since the current tier's own call reads `tier.gold`.
    expect(target.textContent).toContain('next=loyaltyTierBadge.tier.platinum')
  })

  it('keeps the fixed labels on their literal keys', () => {
    const target = render({ tier: 'silver', points: 300, nextTierThreshold: 1000 })
    expect(target.textContent).toContain('loyaltyTierBadge.remaining (')
    expect(target.querySelector('[role="progressbar"]')?.getAttribute('aria-label')).toBe(
      'loyaltyTierBadge.progress (next=loyaltyTierBadge.tier.gold)',
    )
    expect(target.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
      'loyaltyTierBadge.group (tier=loyaltyTierBadge.tier.silver)',
    )

    const top = render({ tier: 'platinum' })
    expect(top.textContent).toContain('loyaltyTierBadge.topTier')
  })
})
