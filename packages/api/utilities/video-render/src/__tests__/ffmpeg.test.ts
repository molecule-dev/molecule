/**
 * Unit tests for the ffmpeg seam:
 *  - Default runner is replaceable via setFfmpegRunner / getFfmpegRunner.
 *  - parseFfmpegProgressSeconds extracts the LAST `time=` token from a chunk.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  defaultFfmpegRunner,
  getFfmpegRunner,
  parseFfmpegProgressSeconds,
  setFfmpegRunner,
  type FfmpegProcess,
} from '../ffmpeg.js'

describe('parseFfmpegProgressSeconds', () => {
  it('parses a single `time=HH:MM:SS.SS` token', () => {
    expect(parseFfmpegProgressSeconds('frame=  60 fps= 30 time=00:00:02.00 bitrate=...')).toBe(2)
  })

  it('returns the LAST time token in a multi-line chunk', () => {
    const chunk =
      'frame= 30 fps= 30 time=00:00:01.00 bitrate=1\nframe= 60 fps= 30 time=00:00:02.50 bitrate=2'
    expect(parseFfmpegProgressSeconds(chunk)).toBe(2.5)
  })

  it('parses HH:MM:SS correctly', () => {
    expect(parseFfmpegProgressSeconds('time=01:30:15.00')).toBe(1 * 3600 + 30 * 60 + 15)
  })

  it('returns undefined when no time token is present', () => {
    expect(parseFfmpegProgressSeconds('hello world')).toBeUndefined()
  })

  it('returns undefined when the time value is malformed', () => {
    // 100 minutes is "valid-looking" but Number-coerces fine; still parses.
    expect(parseFfmpegProgressSeconds('time=00:99:00.00')).toBe(99 * 60)
  })
})

describe('setFfmpegRunner / getFfmpegRunner', () => {
  afterEach(() => {
    setFfmpegRunner(undefined)
  })

  it('returns the default runner initially', () => {
    expect(getFfmpegRunner()).toBe(defaultFfmpegRunner)
  })

  it('replaces and resets the runner', () => {
    const fake = vi.fn(
      () =>
        ({
          stderr: null,
          on: () => {},
          kill: () => true,
        }) as unknown as FfmpegProcess,
    )
    setFfmpegRunner(fake)
    expect(getFfmpegRunner()).toBe(fake)
    setFfmpegRunner(undefined)
    expect(getFfmpegRunner()).toBe(defaultFfmpegRunner)
  })
})
