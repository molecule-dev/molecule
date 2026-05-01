/**
 * Unit tests for the argv builder + validators in `buildFfmpegArgs.ts`.
 *
 * Coverage:
 *  - Pure happy-path argv generation (counts of `-i`, codec/format flags, output path).
 *  - Effect translation for every allow-listed `kind`.
 *  - Sanitization rejects shell metacharacters / leading-dash filenames.
 *  - Numeric / dimension validators reject NaN, Infinity, odd dimensions, etc.
 */

import { describe, expect, it } from 'vitest'

import {
  assertEvenDimension,
  assertFiniteNonNegative,
  assertSafePath,
  assertValidTimeline,
  buildFfmpegArgs,
  effectToFilter,
} from '../buildFfmpegArgs.js'
import type { RenderJobMessage, VideoTimeline } from '../types.js'

const baseTimeline: VideoTimeline = {
  duration: 10,
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  tracks: [
    {
      id: 'v0',
      kind: 'video',
      clips: [
        { id: 'c0', source: '/uploads/intro.mp4', start: 0, duration: 5 },
        { id: 'c1', source: '/uploads/main.mp4', start: 5, duration: 5 },
      ],
      effects: [{ id: 'fx0', kind: 'fade-in', start: 0, duration: 1 }],
    },
  ],
}

const baseMessage: RenderJobMessage = {
  jobId: 'vrj_test',
  timeline: baseTimeline,
  options: {
    outputPath: '/tmp/out.mp4',
    format: 'mp4',
    codec: 'libx264',
  },
}

describe('assertSafePath', () => {
  it('accepts plain absolute paths', () => {
    expect(() => assertSafePath('/uploads/clip.mp4', 'x')).not.toThrow()
    expect(() => assertSafePath('s3://bucket/key.mov', 'x')).not.toThrow()
  })

  it('rejects values starting with -', () => {
    expect(() => assertSafePath('-rf', 'x')).toThrow(/must not start with '-'/)
  })

  it('rejects shell metacharacters', () => {
    expect(() => assertSafePath('/tmp/a;rm -rf /', 'x')).toThrow(/safe set/)
    expect(() => assertSafePath('/tmp/a$(whoami)', 'x')).toThrow(/safe set/)
    expect(() => assertSafePath('/tmp/a`whoami`', 'x')).toThrow(/safe set/)
    expect(() => assertSafePath('/tmp/a|cat', 'x')).toThrow(/safe set/)
    expect(() => assertSafePath('/tmp/a\nb', 'x')).toThrow(/safe set/)
    expect(() => assertSafePath('/tmp/a b.mp4', 'x')).toThrow(/safe set/)
  })

  it('rejects non-string inputs', () => {
    expect(() => assertSafePath(123 as unknown, 'x')).toThrow(/must be a string/)
    expect(() => assertSafePath(undefined as unknown, 'x')).toThrow(/must be a string/)
  })

  it('rejects empty strings and excessively long paths', () => {
    expect(() => assertSafePath('', 'x')).toThrow(/length/)
    expect(() => assertSafePath('/' + 'a'.repeat(2048), 'x')).toThrow(/length/)
  })
})

describe('assertFiniteNonNegative / assertEvenDimension', () => {
  it('accepts valid values', () => {
    expect(assertFiniteNonNegative(0, 'x')).toBe(0)
    expect(assertFiniteNonNegative(1.5, 'x')).toBe(1.5)
    expect(assertEvenDimension(1920, 'x')).toBe(1920)
  })

  it('rejects NaN, Infinity, and negative numbers', () => {
    expect(() => assertFiniteNonNegative(NaN, 'x')).toThrow()
    expect(() => assertFiniteNonNegative(Infinity, 'x')).toThrow()
    expect(() => assertFiniteNonNegative(-1, 'x')).toThrow()
  })

  it('rejects odd dimensions and non-integer dimensions', () => {
    expect(() => assertEvenDimension(1921, 'x')).toThrow(/must be even/)
    expect(() => assertEvenDimension(1920.5, 'x')).toThrow(/integer/)
    expect(() => assertEvenDimension(0, 'x')).toThrow(/positive/)
  })
})

describe('effectToFilter', () => {
  it('translates fade-in / fade-out / crossfade', () => {
    expect(effectToFilter({ id: 'a', kind: 'fade-in', start: 0, duration: 1 })).toBe(
      'fade=t=in:st=0:d=1',
    )
    expect(effectToFilter({ id: 'a', kind: 'fade-out', start: 4, duration: 1 })).toBe(
      'fade=t=out:st=4:d=1',
    )
    expect(effectToFilter({ id: 'a', kind: 'crossfade', start: 2, duration: 0.5 })).toBe(
      'fade=t=in:st=2:d=0.5',
    )
  })

  it('translates crop with all four params', () => {
    expect(
      effectToFilter({
        id: 'a',
        kind: 'crop',
        start: 0,
        duration: 1,
        params: { x: 10, y: 20, width: 1280, height: 720 },
      }),
    ).toBe('crop=1280:720:10:20')
  })

  it('translates scale and volume', () => {
    expect(
      effectToFilter({
        id: 'a',
        kind: 'scale',
        start: 0,
        duration: 1,
        params: { width: 640, height: 480 },
      }),
    ).toBe('scale=640:480')
    expect(
      effectToFilter({ id: 'a', kind: 'volume', start: 0, duration: 1, params: { level: 0.5 } }),
    ).toBe('volume=0.5')
  })

  it('rejects unknown effect kinds', () => {
    expect(() =>
      // @ts-expect-error — exercising runtime guard
      effectToFilter({ id: 'a', kind: 'evil-filter', start: 0, duration: 1 }),
    ).toThrow(/Unsupported effect kind/)
  })

  it('rejects volume levels outside [0, 8]', () => {
    expect(() =>
      effectToFilter({
        id: 'a',
        kind: 'volume',
        start: 0,
        duration: 1,
        params: { level: 100 },
      }),
    ).toThrow(/level must be a finite number in \[0, 8\]/)
  })

  it('rejects crop dimensions that are not even', () => {
    expect(() =>
      effectToFilter({
        id: 'a',
        kind: 'crop',
        start: 0,
        duration: 1,
        params: { x: 0, y: 0, width: 1281, height: 720 },
      }),
    ).toThrow(/even/)
  })
})

describe('assertValidTimeline', () => {
  it('accepts the canonical fixture', () => {
    expect(() => assertValidTimeline(baseTimeline)).not.toThrow()
  })

  it('rejects a timeline with a malicious clip source', () => {
    expect(() =>
      assertValidTimeline({
        ...baseTimeline,
        tracks: [
          {
            id: 'v0',
            kind: 'video',
            clips: [{ id: 'c0', source: '/tmp/a;rm -rf /', start: 0, duration: 1 }],
          },
        ],
      }),
    ).toThrow(/safe set/)
  })

  it('rejects a timeline with an odd-resolution width', () => {
    expect(() =>
      assertValidTimeline({ ...baseTimeline, resolution: { width: 1921, height: 1080 } }),
    ).toThrow(/even/)
  })

  it('rejects fps > 240', () => {
    expect(() => assertValidTimeline({ ...baseTimeline, fps: 1000 })).toThrow(/fps/)
  })

  it('rejects clips with bad numeric fields', () => {
    expect(() =>
      assertValidTimeline({
        ...baseTimeline,
        tracks: [
          {
            id: 'v0',
            kind: 'video',
            clips: [{ id: 'c0', source: '/x.mp4', start: -1, duration: 5 }],
          },
        ],
      }),
    ).toThrow(/start/)
  })
})

describe('buildFfmpegArgs', () => {
  it('emits one -i per clip and tail flags in the right order', () => {
    const args = buildFfmpegArgs(baseMessage)
    // Two clips → two `-i` flags.
    expect(args.filter((a) => a === '-i')).toHaveLength(2)
    // -t flags for clip durations.
    expect(args.filter((a) => a === '-t')).toHaveLength(2)
    // Codec, container, output path.
    expect(args).toContain('-c:v')
    expect(args[args.indexOf('-c:v') + 1]).toBe('libx264')
    expect(args).toContain('-f')
    expect(args[args.indexOf('-f') + 1]).toBe('mp4')
    expect(args[args.length - 1]).toBe('/tmp/out.mp4')
    // Filter complex from the fade-in effect.
    expect(args).toContain('-filter_complex')
    expect(args[args.indexOf('-filter_complex') + 1]).toBe('fade=t=in:st=0:d=1')
    // Output dimensions.
    expect(args).toContain('-s')
    expect(args[args.indexOf('-s') + 1]).toBe('1920x1080')
  })

  it('omits -filter_complex when there are no effects', () => {
    const args = buildFfmpegArgs({
      ...baseMessage,
      timeline: {
        ...baseTimeline,
        tracks: [{ id: 'v0', kind: 'video', clips: baseTimeline.tracks[0]!.clips }],
      },
    })
    expect(args).not.toContain('-filter_complex')
  })

  it('passes -ss when sourceStart > 0', () => {
    const args = buildFfmpegArgs({
      ...baseMessage,
      timeline: {
        ...baseTimeline,
        tracks: [
          {
            id: 'v0',
            kind: 'video',
            clips: [{ id: 'c0', source: '/uploads/x.mp4', start: 0, duration: 5, sourceStart: 2 }],
          },
        ],
      },
    })
    expect(args).toContain('-ss')
    expect(args[args.indexOf('-ss') + 1]).toBe('2')
  })

  it('rejects malicious outputPath', () => {
    expect(() =>
      buildFfmpegArgs({
        ...baseMessage,
        options: { ...baseMessage.options, outputPath: '/tmp/$(rm -rf /)' },
      }),
    ).toThrow(/outputPath/)
  })

  it('rejects an outputPath that begins with -', () => {
    expect(() =>
      buildFfmpegArgs({
        ...baseMessage,
        options: { ...baseMessage.options, outputPath: '-evil.mp4' },
      }),
    ).toThrow(/must not start with '-'/)
  })

  it('emits -crf when supplied', () => {
    const args = buildFfmpegArgs({
      ...baseMessage,
      options: { ...baseMessage.options, crf: 18 },
    })
    expect(args).toContain('-crf')
    expect(args[args.indexOf('-crf') + 1]).toBe('18')
  })

  it('rejects out-of-range crf', () => {
    expect(() =>
      buildFfmpegArgs({
        ...baseMessage,
        options: { ...baseMessage.options, crf: 999 },
      }),
    ).toThrow(/crf/)
  })

  it('returns a frozen array', () => {
    const args = buildFfmpegArgs(baseMessage)
    expect(Object.isFrozen(args)).toBe(true)
  })
})
