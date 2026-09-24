/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real default stepper bond.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { provider } from '@molecule/app-stepper-default'

import type { Step } from '../index.js'
import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  it('blocks incomplete linear steps, skips optional ones and reports completion', () => {
    setProvider(provider)

    const account: Step = { label: 'Account' }
    const profile: Step = { label: 'Profile', optional: true }
    const review: Step = { label: 'Review' }

    let activeStep = 0
    const changes: number[] = []
    const stepper = requireProvider().createStepper({
      steps: [account, profile, review],
      linear: true,
      onStepChange: (step) => {
        activeStep = step
        changes.push(step)
      },
    })

    stepper.next()
    expect(stepper.getActiveStep()).toBe(0)
    expect(changes).toEqual([])

    account.completed = true
    stepper.next()
    expect(activeStep).toBe(1)
    stepper.next()
    expect(activeStep).toBe(2)

    expect(stepper.isComplete()).toBe(false)
    review.completed = true
    expect(activeStep).toBe(2)
    expect(stepper.isComplete()).toBe(true)
    expect(changes).toEqual([1, 2])

    stepper.destroy()
  })
})
