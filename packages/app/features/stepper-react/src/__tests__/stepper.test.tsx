import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

const { Stepper } = await import('../Stepper.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const steps = [
  { id: 'a', label: 'Cart' },
  { id: 'b', label: 'Shipping' },
  { id: 'c', label: 'Payment' },
]

describe('Stepper', () => {
  it('renders every step label in the default dots variant', () => {
    const markup = html(createElement(Stepper, { steps, currentStep: 1 }))
    expect(markup).toContain('Cart')
    expect(markup).toContain('Shipping')
    expect(markup).toContain('Payment')
  })

  it('shows a check for completed steps and a number for the rest (dots)', () => {
    const markup = html(createElement(Stepper, { steps, currentStep: 1 }))
    // step 0 completed => ✓, steps 1 & 2 => numbers 2 and 3
    expect(markup).toContain('✓')
    expect(markup).toContain('>2<')
    expect(markup).toContain('>3<')
  })

  it('marks the current step with aria-current="step"', () => {
    const markup = html(createElement(Stepper, { steps, currentStep: 1 }))
    expect(markup.match(/aria-current="step"/g) ?? []).toHaveLength(1)
  })

  it('renders a progress bar fill for the bar variant', () => {
    const markup = html(createElement(Stepper, { steps, currentStep: 1, variant: 'bar' }))
    // currentStep 1 of 3 => 50%
    expect(markup).toContain('width:50%')
  })

  it('renders numbered card buttons for the cards variant', () => {
    const markup = html(createElement(Stepper, { steps, currentStep: 0, variant: 'cards' }))
    expect(markup).toContain('1. Cart')
    expect(markup).toContain('2. Shipping')
  })

  it('forwards className', () => {
    const markup = html(createElement(Stepper, { steps, currentStep: 0, className: 'stp-cls' }))
    expect(markup).toContain('stp-cls')
  })
})
