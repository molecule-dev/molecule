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

/** A minimal React-element shape for walking a rendered tree in tests. */
interface TestElement {
  props?: Record<string, unknown> & { children?: unknown }
}

/**
 * Collects every element in a rendered React tree carrying the given
 * `data-mol-id`. Stepper is a pure, hookless function component, so it can
 * be invoked directly and its returned element tree walked without a DOM.
 */
function collectByMolId(node: unknown, id: string, out: TestElement[] = []): TestElement[] {
  if (node == null || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const child of node) collectByMolId(child, id, out)
    return out
  }
  const el = node as TestElement
  if (el.props) {
    if (el.props['data-mol-id'] === id) out.push(el)
    collectByMolId(el.props.children, id, out)
  }
  return out
}

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

  it('tags every dots step with a data-mol-id', () => {
    const markup = html(createElement(Stepper, { steps, currentStep: 1, onStepClick: () => {} }))
    expect(markup).toContain('data-mol-id="stepper-step-a"')
    expect(markup).toContain('data-mol-id="stepper-step-b"')
    expect(markup).toContain('data-mol-id="stepper-step-c"')
  })

  it('dots: clicking ANY step invokes onStepClick with that step id and index (per doc)', () => {
    const onStepClick = vi.fn()
    const tree = Stepper({ steps, currentStep: 1, variant: 'dots', onStepClick })
    // completed (0), current (1) and pending (2) all fire in the dots variant
    for (const [id, index] of [
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ] as const) {
      const [btn] = collectByMolId(tree, `stepper-step-${id}`)
      expect(btn).toBeDefined()
      ;(btn.props?.onClick as () => void)()
      expect(onStepClick).toHaveBeenCalledWith(id, index)
    }
    expect(onStepClick).toHaveBeenCalledTimes(3)
  })

  it('dots: with no onStepClick the dots are non-interactive (disabled, no handler)', () => {
    const tree = Stepper({ steps, currentStep: 1, variant: 'dots' })
    const [btn] = collectByMolId(tree, 'stepper-step-b')
    expect(btn.props?.onClick).toBeUndefined()
    expect(btn.props?.disabled).toBe(true)
  })

  it('cards: only completed steps are clickable; others render disabled (per doc)', () => {
    const onStepClick = vi.fn()
    // currentStep 2 => steps 0,1 completed, step 2 current
    const tree = Stepper({ steps, currentStep: 2, variant: 'cards', onStepClick })

    const [completed] = collectByMolId(tree, 'stepper-step-a')
    expect(completed.props?.disabled).toBe(false)
    ;(completed.props?.onClick as () => void)()
    expect(onStepClick).toHaveBeenCalledWith('a', 0)

    const [current] = collectByMolId(tree, 'stepper-step-c')
    expect(current.props?.disabled).toBe(true)
    expect(current.props?.onClick).toBeUndefined()
  })
})
