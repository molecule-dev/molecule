// @vitest-environment jsdom
/**
 * Unit tests for the Solid `SubscriptionPlanCard` — a port of
 * `@molecule/app-subscription-plan-card-react/src/__tests__/subscription-plan-card.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { inlineStyleMismatch } from '@molecule/app-framework-conformance/ui'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

/** React-style inline styles as Solid's `style` prop takes them (kebab keys, px numbers). */
const solidStyle = (style?: Record<string, string | number>): Record<string, string> | undefined =>
  style
    ? Object.fromEntries(
        Object.entries(style).map(([key, value]) => [
          key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`),
          typeof value === 'number' ? `${value}px` : value,
        ]),
      )
    : undefined

vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: {
    children?: JSX.Element
    color?: string
    onClick?: (event?: MouseEvent) => void
  }) => (
    <button data-button="" onClick={props.onClick}>
      {props.children}
    </button>
  ),
  Card: (props: {
    children?: JSX.Element
    className?: string
    style?: Record<string, string | number>
  }) => (
    <div data-card="" class={props.className} style={solidStyle(props.style)}>
      {props.children}
    </div>
  ),
}))

const { SubscriptionPlanCard } = await import('../SubscriptionPlanCard.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Render with Solid's browser renderer and return the wrapper element. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('SubscriptionPlanCard', () => {
  it('renders the name in an <h3>, the price, and the interval', () => {
    const container = mount(() => (
      <SubscriptionPlanCard name="Pro" price="$19" interval="/mo" features={['Unlimited']} />
    ))
    expect(container.innerHTML).toContain('<h3')
    expect(container.innerHTML).toContain('Pro')
    expect(container.innerHTML).toContain('$19')
    expect(container.innerHTML).toContain('/mo')
  })

  it('renders each feature with a check mark', () => {
    const container = mount(() => (
      <SubscriptionPlanCard name="P" price="$1" features={['Feature A', 'Feature B']} />
    ))
    expect(container.innerHTML).toContain('Feature A')
    expect(container.innerHTML).toContain('Feature B')
    expect(container.innerHTML.split('✓').length - 1).toBe(2)
  })

  it('renders the CTA as a button (onCta) or a link (ctaHref)', () => {
    const withClick = mount(() => (
      <SubscriptionPlanCard
        name="P"
        price="$1"
        features={[]}
        ctaLabel="Choose Pro"
        onCta={() => {}}
      />
    ))
    expect(withClick.innerHTML).toContain('Choose Pro')
    const withHref = mount(() => (
      <SubscriptionPlanCard
        name="P"
        price="$1"
        features={[]}
        ctaLabel="Choose Pro"
        ctaHref="/checkout"
      />
    ))
    expect(withHref.innerHTML).toContain('href="/checkout"')
  })

  it('highlights a recommended plan with the default badge and outline style', () => {
    const container = mount(() => (
      <SubscriptionPlanCard name="P" price="$1" features={[]} recommended />
    ))
    expect(container.innerHTML).toContain('Recommended')
    expect(
      inlineStyleMismatch(container.innerHTML, { outline: '2px solid currentColor' }),
    ).toBeNull()
  })

  it('renders a custom badge', () => {
    const container = mount(() => (
      <SubscriptionPlanCard name="P" price="$1" features={[]} badge="Most popular" />
    ))
    expect(container.innerHTML).toContain('Most popular')
  })

  it('forwards className', () => {
    const container = mount(() => (
      <SubscriptionPlanCard name="P" price="$1" features={[]} className="spc-cls" />
    ))
    expect(container.innerHTML).toContain('spc-cls')
  })
})
