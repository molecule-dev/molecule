/**
 * The paced publisher and the release's publish-stage estimate must agree on
 * the pacing, and the estimate must account for the waiting the publisher
 * actually does. 217 packages at 20 s pacing is 72 minutes of deliberate sleep
 * — the old static 12-minute stage estimate called that an over-run at 24
 * minutes (Release run 40233129539).
 */
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PUBLISH_DELAY_S,
  envPublishDelaySeconds,
  estimatePublishMinutes,
} from '../lib/publish-pacing.mjs'

/** The publish stage's own static estimate, from release.mjs's STAGE_ETA. */
const BASE_MINUTES = 12

describe('envPublishDelaySeconds', () => {
  it('reads the same fallback the publisher always used', () => {
    expect(DEFAULT_PUBLISH_DELAY_S).toBe(20)
    // The Release workflow's blank input, an explicit "0", a non-number and an
    // absent variable all mean the default — `Number(value) || default`,
    // exactly as publish-paced.mjs computed it before this module existed.
    expect(envPublishDelaySeconds(undefined)).toBe(DEFAULT_PUBLISH_DELAY_S)
    expect(envPublishDelaySeconds('')).toBe(DEFAULT_PUBLISH_DELAY_S)
    expect(envPublishDelaySeconds('0')).toBe(DEFAULT_PUBLISH_DELAY_S)
    expect(envPublishDelaySeconds('soon')).toBe(DEFAULT_PUBLISH_DELAY_S)
  })

  it('honours a configured pace', () => {
    expect(envPublishDelaySeconds('60')).toBe(60)
    expect(envPublishDelaySeconds('5')).toBe(5)
  })
})

describe('estimatePublishMinutes', () => {
  it('covers a fleet wave at the default pace (the 217-package case)', () => {
    // 217 × 20 s = 4340 s = 72.3 min.
    const minutes = estimatePublishMinutes({
      pending: 217,
      delaySeconds: DEFAULT_PUBLISH_DELAY_S,
      baseMinutes: BASE_MINUTES,
    })
    expect(minutes).toBe(73)
    expect(minutes).toBeGreaterThan(BASE_MINUTES * 2)
  })

  it('keeps the stage normal estimate for a small or empty wave', () => {
    const at = (pending: number) =>
      estimatePublishMinutes({
        pending,
        delaySeconds: DEFAULT_PUBLISH_DELAY_S,
        baseMinutes: BASE_MINUTES,
      })
    expect(at(0)).toBe(BASE_MINUTES)
    expect(at(1)).toBe(BASE_MINUTES)
    expect(at(4)).toBe(BASE_MINUTES)
    expect(at(36)).toBe(BASE_MINUTES) // exactly the 12-minute floor
    expect(at(37)).toBe(13)
  })

  it('follows a custom configured pace', () => {
    const at = (delaySeconds: number) =>
      estimatePublishMinutes({ pending: 217, delaySeconds, baseMinutes: BASE_MINUTES })
    expect(at(60)).toBe(217)
    expect(at(25)).toBe(91) // ceil(217 × 25 / 60)
    expect(at(5)).toBe(19) // ceil(217 × 5 / 60)
  })

  it('never estimates below the stage normal estimate', () => {
    for (const pending of [0, 1, 10, 217, 1000]) {
      for (const delaySeconds of [1, 20, 60]) {
        expect(
          estimatePublishMinutes({ pending, delaySeconds, baseMinutes: BASE_MINUTES }),
        ).toBeGreaterThanOrEqual(BASE_MINUTES)
      }
    }
  })

  it('treats an unusable pending count or pace as no pacing, never NaN', () => {
    const at = (pending: number, delaySeconds: number) =>
      estimatePublishMinutes({ pending, delaySeconds, baseMinutes: BASE_MINUTES })
    expect(at(Number.NaN, 20)).toBe(BASE_MINUTES)
    expect(at(-3, 20)).toBe(BASE_MINUTES)
    expect(at(217, Number.NaN)).toBe(BASE_MINUTES)
    expect(at(217, 0)).toBe(BASE_MINUTES)
    expect(at(217, -5)).toBe(BASE_MINUTES)
  })
})
