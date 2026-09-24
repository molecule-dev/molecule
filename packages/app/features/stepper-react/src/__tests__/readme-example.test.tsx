// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Stepper, type StepperStep } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered checkout stepper.
 */
function CheckoutProgress(): React.JSX.Element {
  const steps: StepperStep[] = [
    { id: 'cart', label: 'Cart' },
    { id: 'shipping', label: 'Shipping', description: 'Address and delivery speed' },
    { id: 'payment', label: 'Payment' },
    { id: 'review', label: 'Review' },
  ]
  const [currentStep, setCurrentStep] = useState(2)
  return (
    <Stepper
      steps={steps}
      currentStep={currentStep}
      variant="cards"
      onStepClick={(_stepId, index) => setCurrentStep(index)}
    />
  )
}

let root: Root | undefined
let container: HTMLElement

/**
 * Finds the card button for a step id.
 *
 * @param id - Step id.
 * @returns The step's button.
 */
function step(id: string): HTMLButtonElement {
  const el = container.querySelector<HTMLButtonElement>(`[data-mol-id="stepper-step-${id}"]`)
  if (!el) throw new Error(`step ${id} not rendered`)
  return el
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })
  afterEach(() => {
    act(() => root?.unmount())
    container.remove()
  })

  it('marks the current card, enables only completed cards, and navigates back on click', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root?.render(<CheckoutProgress />))

    expect(step('payment').getAttribute('aria-current')).toBe('step')
    expect(step('payment').textContent).toBe('3. Payment')
    expect(step('shipping').textContent).toContain('Address and delivery speed')
    expect(step('cart').disabled).toBe(false)
    expect(step('shipping').disabled).toBe(false)
    expect(step('payment').disabled).toBe(true)
    expect(step('review').disabled).toBe(true)

    act(() => step('cart').click())
    expect(step('cart').getAttribute('aria-current')).toBe('step')
    expect(step('payment').getAttribute('aria-current')).toBeNull()
    expect(step('shipping').disabled).toBe(true)
  })
})
