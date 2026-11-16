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

describe('native unfinished Playwright action clocks', () => {
  it('records elapsed time for a native unfinished parent and its blocking child', () => {
    const result = playwrightAttemptTimings({
      startTime: start,
      duration: 2003,
      steps: [
        step({
          duration: -1,
          steps: [step({ startTime: new Date(start.getTime() + 78), duration: -1 })],
        }),
      ],
    })
    expect(
      result.steps.map(({ durationMs, unfinished, failed }) => ({
        durationMs,
        unfinished,
        failed,
      })),
    ).toEqual([
      { durationMs: 2003, unfinished: true, failed: false },
      { durationMs: 1925, unfinished: true, failed: false },
    ])
  })

  it('uses the native After Hooks boundary when setup is outside the charged test duration', () => {
    const result = playwrightAttemptTimings({
      startTime: start,
      duration: 2000,
      steps: [
        step({ title: 'Before Hooks', category: 'hook', duration: 3000 }),
        step({ startTime: new Date(start.getTime() + 3000), duration: -1 }),
        step({
          title: 'After Hooks',
          category: 'hook',
          startTime: new Date(start.getTime() + 5000),
          duration: 20,
        }),
      ],
    })
    expect(result.steps[1]).toMatchObject({ durationMs: 2000, unfinished: true })
    expect(result.steps[2]?.durationMs).toBe(20)
    expect(result.steps[2]).not.toHaveProperty('unfinished')
  })

  it('does not turn an inconsistent or invalid clock into a plausible zero', () => {
    for (const stepStart of [new Date(start.getTime() + 6000), new Date(NaN)]) {
      const result = playwrightAttemptTimings({
        startTime: start,
        duration: 2000,
        steps: [step({ startTime: stepStart, duration: -1 })],
      })
      expect(result.steps[0]).toMatchObject({ durationMs: null, unfinished: true })
    }
  })
})
