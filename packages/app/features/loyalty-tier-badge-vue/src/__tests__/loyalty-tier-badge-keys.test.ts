// @vitest-environment jsdom
/**
 * Literal-key test for the Vue `LoyaltyTierBadge`: the `t` provider returns
 * the key itself, so every visible label proves the component translates
 * through one literal key per value (never a key built at runtime). A 1:1
 * port of the React package's `LoyaltyTierBadgeKeys.test.tsx`.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
    fontWeight: () => 'fw',
  }),
}))

vi.mock('@molecule/app-vue', () => ({
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

import { createApp, defineComponent, h } from 'vue'

import { LoyaltyTierBadge } from '../index.js'
import type { LoyaltyTierBadgeProps } from '../types.js'

const mounted: Array<{ unmount: () => void; host: HTMLElement }> = []

afterEach(() => {
  for (const { unmount, host } of mounted.splice(0)) {
    unmount()
    host.remove()
  }
  document.body.innerHTML = ''
})

/**
 * Renders a {@link LoyaltyTierBadge} and returns the mounted host.
 *
 * @param props - The badge props.
 * @returns The host element the badge rendered into.
 */
const render = (props: LoyaltyTierBadgeProps): { host: HTMLElement } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(LoyaltyTierBadge, props) }))
  app.mount(host)
  mounted.push({ unmount: () => app.unmount(), host })
  return { host }
}

describe('translated tier names come from literal keys', () => {
  it('renders each tier through its literal key', () => {
    expect(render({ tier: 'bronze' }).host.textContent).toContain('loyaltyTierBadge.tier.bronze')
    expect(render({ tier: 'silver' }).host.textContent).toContain('loyaltyTierBadge.tier.silver')
    expect(render({ tier: 'gold' }).host.textContent).toContain('loyaltyTierBadge.tier.gold')
    expect(render({ tier: 'platinum' }).host.textContent).toContain(
      'loyaltyTierBadge.tier.platinum',
    )
  })

  it('renders the next tier through its literal key', () => {
    const { host } = render({
      tier: 'gold',
      points: 50000,
      nextTierThreshold: 100000,
    })
    // The next tier after gold is platinum; the label can only come from the
    // next-tier call, since the current tier's own call reads `tier.gold`.
    expect(host.textContent).toContain('next=loyaltyTierBadge.tier.platinum')
  })

  it('keeps the fixed labels on their literal keys', () => {
    const { host } = render({ tier: 'silver', points: 300, nextTierThreshold: 1000 })
    expect(host.textContent).toContain('loyaltyTierBadge.remaining (')
    expect(host.querySelector('[role="progressbar"]')?.getAttribute('aria-label')).toBe(
      'loyaltyTierBadge.progress (next=loyaltyTierBadge.tier.gold)',
    )
    expect(host.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
      'loyaltyTierBadge.group (tier=loyaltyTierBadge.tier.silver)',
    )

    const top = render({ tier: 'platinum' })
    expect(top.host.textContent).toContain('loyaltyTierBadge.topTier')
  })
})
