import { describe, expect, it } from 'vitest'

import {
  playwrightAttemptTimings,
  type PlaywrightTimingStep,
} from '../playwright-attempt-timings.js'

const start = new Date('2026-11-12T12:00:00Z')
const step = (extra: Partial<PlaywrightTimingStep> = {}): PlaywrightTimingStep => ({
  category: 'pw:api',
  startTime: start,
  duration: 12,
  steps: [],
  ...extra,
})

describe('native Playwright attempt timings', () => {
  it('keeps nested action clocks and source locations, without values or error text', () => {
    const native = step({
      category: 'hook',
      duration: 200,
      steps: [
        {
          ...step({
            duration: 155,
            location: { file: '/workspace/catalog/setup.ts', line: 46, column: 3 },
            error: new Error('secret'),
          }),
          title: 'fill private-password',
          parameters: { value: 'secret' },
        },
      ],
    } as PlaywrightTimingStep)
    const result = playwrightAttemptTimings({ startTime: start, duration: 201, steps: [native] })
    expect(result.steps).toEqual([
      {
        parent: null,
        category: 'hook',
        startTime: start.toISOString(),
        durationMs: 200,
        failed: false,
      },
      {
        parent: 0,
        category: 'pw:api',
        startTime: start.toISOString(),
        durationMs: 155,
        location: { file: '/workspace/catalog/setup.ts', line: 46, column: 3 },
        failed: true,
      },
    ])
    expect(JSON.stringify(result)).not.toMatch(/secret|password|parameters|title/)
    expect(result.omittedSteps).toBe(0)
  })

  it('records an explicit bound without losing the total omitted count', () => {
    const result = playwrightAttemptTimings({
      startTime: start,
      duration: 1,
      steps: Array.from({ length: 2_003 }, () => step()),
    })
    expect(result.steps).toHaveLength(2_000)
    expect(result.omittedSteps).toBe(3)
  })

  it('handles a non-browser test with no native actions', () => {
    expect(playwrightAttemptTimings({ startTime: start, duration: 3, steps: [] })).toEqual({
      version: 1,
      startTime: start.toISOString(),
      durationMs: 3,
      steps: [],
      omittedSteps: 0,
    })
  })

  it('runs after source emission without importing its owning module', () => {
    const emitted = new Function(
      `return (${playwrightAttemptTimings.toString()})`,
    )() as typeof playwrightAttemptTimings
    expect(emitted({ startTime: start, duration: 5, steps: [step()] })).toEqual(
      playwrightAttemptTimings({ startTime: start, duration: 5, steps: [step()] }),
    )
  })
})
