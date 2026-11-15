// @vitest-environment jsdom
/**
 * Unit tests for `SubscriptionPlanCard`, ported from
 * `@molecule/app-subscription-plan-card-react`'s own suite: the same
 * behavioral assertions, rendered with a real mount (jsdom) and the bonded
 * ClassMap.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { describe, expect, it } from 'vitest'

import SubscriptionPlanCard from '../SubscriptionPlanCard.svelte'

/** Renders a `SubscriptionPlanCard` with the given props, returning the host markup. */
const render = (props: Record<string, unknown>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(SubscriptionPlanCard, { target, props })
  flushSync()
  const markup = target.innerHTML
  unmount(instance)
  target.remove()
  return markup
}

describe('SubscriptionPlanCard', () => {
  it('renders the name in an <h3>, the price, and the interval', () => {
    const markup = render({
      name: 'Pro',
      price: '$19',
      interval: '/mo',
      features: ['Unlimited projects'],
    })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Pro')
    expect(markup).toContain('$19')
    expect(markup).toContain('/mo')
  })

  it('renders each feature with a check mark', () => {
    const markup = render({
      name: 'P',
      price: '$1',
      features: ['Feature A', 'Feature B'],
    })
    expect(markup).toContain('Feature A')
    expect(markup).toContain('Feature B')
    expect(markup.split('✓').length - 1).toBe(2)
  })

  it('renders the CTA as a button (onCta) or a link (ctaHref)', () => {
    const withClick = render({
      name: 'P',
      price: '$1',
      features: [],
      ctaLabel: 'Choose Pro',
      onCta: () => {},
    })
    expect(withClick).toContain('Choose Pro')
    const withHref = render({
      name: 'P',
      price: '$1',
      features: [],
      ctaLabel: 'Choose Pro',
      ctaHref: '/checkout',
    })
    expect(withHref).toContain('href="/checkout"')
  })

  it('highlights a recommended plan with the default badge and outline style', () => {
    const markup = render({
      name: 'P',
      price: '$1',
      features: [],
      recommended: true,
    })
    expect(markup).toContain('Recommended')
    expect(markup).toContain('outline: 2px solid currentColor')
  })

  it('renders a custom badge', () => {
    const markup = render({
      name: 'P',
      price: '$1',
      features: [],
      badge: 'Most popular',
    })
    expect(markup).toContain('Most popular')
  })

  it('forwards className', () => {
    const markup = render({
      name: 'P',
      price: '$1',
      features: [],
      className: 'spc-cls',
    })
    expect(markup).toContain('spc-cls')
  })
})
