/**
 * Pure function: turn a {@link VideoTimeline} + resolved options into a
 * read-only ffmpeg argv array.
 *
 * Defence-in-depth notes:
 * - Each value is validated for type + character set BEFORE going into argv.
 * - We never construct `-vf` filter strings from user input. The only filter
 *   tokens we emit come from a fixed allow-list keyed by `effect.kind`, with
 *   numeric parameters only.
 * - File paths must be plain strings without shell metacharacters or
 *   newlines. The argv is passed to `child_process.spawn` with `shell: false`
 *   so argv elements are NEVER interpreted by a shell, but we still reject
 *   suspicious paths to make malformed input fail loudly.
 *
 * @module
 */

import type {
  RenderJobMessage,
  VideoClip,
  VideoEffect,
  VideoTimeline,
  VideoTrack,
} from './types.js'

/**
 * Allowed characters in source paths and the output path. Conservative on
 * purpose: alphanumerics, common URL separators, and a handful of safe
 * filename punctuation. No spaces, no shell metacharacters.
 *
 * `child_process.spawn(args, { shell: false })` already prevents shell
 * interpretation, but argv-injection-style abuse can still happen with
 * carefully-crafted ffmpeg-flag values (e.g. a "filename" of `-f`,
 * `-i`, etc. read by ffmpeg as an option). Rejecting leading-dash values
 * and shell metacharacters both is the only safe posture.
 */
const SAFE_PATH_RE = /^[A-Za-z0-9_./:\-+@%]+$/

/**
 * Validate a source path or URL. Throws `TypeError` with a descriptive
 * message if the value is unsafe.
 *
 * @param value - The candidate path/URL.
 * @param label - Human-readable name (e.g. `'clip.source'`) for error messages.
 */
export function assertSafePath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a string`)
  }
  if (value.length === 0 || value.length > 2048) {
    throw new TypeError(`${label} length out of range`)
  }
  if (value.startsWith('-')) {
    throw new TypeError(`${label} must not start with '-' (would be parsed as ffmpeg option)`)
  }
  if (!SAFE_PATH_RE.test(value)) {
    throw new TypeError(`${label} contains characters outside the safe set [A-Za-z0-9_./:\\-+@%]`)
  }
}

/**
 * Validate a finite, non-negative number with an upper bound. Throws on bad
 * input.
 *
 * @param value - The candidate number.
 * @param label - Field name for error messages.
 * @param max - Optional maximum (defaults to 24h in seconds).
 */
export function assertFiniteNonNegative(value: unknown, label: string, max = 86_400): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label} must be a finite non-negative number`)
  }
  if (value > max) {
    throw new TypeError(`${label} exceeds maximum of ${max}`)
  }
  return value
}

/**
 * Validate an even, positive integer dimension (codec requirement).
 *
 * @param value - The candidate dimension.
 * @param label - Field name for error messages.
 */
export function assertEvenDimension(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive integer`)
  }
  if (value % 2 !== 0) {
    throw new TypeError(`${label} must be even`)
  }
  if (value > 8192) {
    throw new TypeError(`${label} exceeds maximum of 8192`)
  }
  return value
}

/**
 * Validate an effect kind against the allow-list and return a fixed,
 * parameter-only filter string. Numeric parameters are validated and
 * formatted; nothing user-typed is interpolated as a filter token.
 *
 * @param effect - The effect to translate.
 * @returns The ffmpeg filter expression for the effect.
 */
export function effectToFilter(effect: VideoEffect): string {
  const start = assertFiniteNonNegative(effect.start, 'effect.start')
  const duration = assertFiniteNonNegative(effect.duration, 'effect.duration')
  const params = effect.params ?? {}

  switch (effect.kind) {
    case 'fade-in': {
      return `fade=t=in:st=${start}:d=${duration}`
    }
    case 'fade-out': {
      return `fade=t=out:st=${start}:d=${duration}`
    }
    case 'crossfade': {
      // Cross-fading is a track-level transition; we still emit a fade since
      // the multi-input xfade graph is built by the worker, not here.
      return `fade=t=in:st=${start}:d=${duration}`
    }
    case 'crop': {
      const w = assertEvenDimension(params['width'], 'effect.params.width')
      const h = assertEvenDimension(params['height'], 'effect.params.height')
      const x = assertFiniteNonNegative(params['x'] ?? 0, 'effect.params.x', 8192)
      const y = assertFiniteNonNegative(params['y'] ?? 0, 'effect.params.y', 8192)
      return `crop=${w}:${h}:${x}:${y}`
    }
    case 'scale': {
      const w = assertEvenDimension(params['width'], 'effect.params.width')
      const h = assertEvenDimension(params['height'], 'effect.params.height')
      return `scale=${w}:${h}`
    }
    case 'volume': {
      const level = params['level']
      if (typeof level !== 'number' || !Number.isFinite(level) || level < 0 || level > 8) {
        throw new TypeError('effect.params.level must be a finite number in [0, 8]')
      }
      return `volume=${level}`
    }
    default: {
      const _exhaustive: never = effect.kind
      throw new TypeError(`Unsupported effect kind: ${String(_exhaustive)}`)
    }
  }
}

/**
 * Validate a {@link VideoClip}'s shape and return a sanitized copy.
 *
 * @param clip - The candidate clip.
 * @param trackId - Owning track ID, for error messages.
 */
export function assertValidClip(clip: VideoClip, trackId: string): VideoClip {
  if (typeof clip.id !== 'string' || clip.id.length === 0) {
    throw new TypeError(`track[${trackId}].clip.id must be a non-empty string`)
  }
  assertSafePath(clip.source, `track[${trackId}].clip[${clip.id}].source`)
  assertFiniteNonNegative(clip.start, `track[${trackId}].clip[${clip.id}].start`)
  assertFiniteNonNegative(clip.duration, `track[${trackId}].clip[${clip.id}].duration`)
  if (clip.sourceStart !== undefined) {
    assertFiniteNonNegative(clip.sourceStart, `track[${trackId}].clip[${clip.id}].sourceStart`)
  }
  if (clip.volume !== undefined) {
    if (
      typeof clip.volume !== 'number' ||
      !Number.isFinite(clip.volume) ||
      clip.volume < 0 ||
      clip.volume > 8
    ) {
      throw new TypeError(`track[${trackId}].clip[${clip.id}].volume must be in [0, 8]`)
    }
  }
  return clip
}

/**
 * Validate a {@link VideoTrack} and its clips/effects.
 *
 * @param track - The candidate track.
 */
export function assertValidTrack(track: VideoTrack): VideoTrack {
  if (typeof track.id !== 'string' || track.id.length === 0) {
    throw new TypeError('track.id must be a non-empty string')
  }
  if (track.kind !== 'video' && track.kind !== 'audio') {
    throw new TypeError(`track[${track.id}].kind must be 'video' or 'audio'`)
  }
  if (!Array.isArray(track.clips)) {
    throw new TypeError(`track[${track.id}].clips must be an array`)
  }
  for (const clip of track.clips) {
    assertValidClip(clip, track.id)
  }
  for (const effect of track.effects ?? []) {
    // Validates + throws on bad input.
    effectToFilter(effect)
  }
  return track
}

/**
 * Validate a complete {@link VideoTimeline}.
 *
 * @param timeline - The candidate timeline.
 */
export function assertValidTimeline(timeline: VideoTimeline): VideoTimeline {
  assertFiniteNonNegative(timeline.duration, 'timeline.duration')
  assertEvenDimension(timeline.resolution.width, 'timeline.resolution.width')
  assertEvenDimension(timeline.resolution.height, 'timeline.resolution.height')
  if (
    typeof timeline.fps !== 'number' ||
    !Number.isFinite(timeline.fps) ||
    timeline.fps <= 0 ||
    timeline.fps > 240
  ) {
    throw new TypeError('timeline.fps must be a finite positive number ≤ 240')
  }
  if (!Array.isArray(timeline.tracks)) {
    throw new TypeError('timeline.tracks must be an array')
  }
  for (const track of timeline.tracks) {
    assertValidTrack(track)
  }
  return timeline
}

/**
 * Build a flat, read-only argv array for ffmpeg from a validated render
 * message. Inputs are passed via `-i` per clip; effects translate to
 * a filter_complex graph via the allow-listed {@link effectToFilter}.
 *
 * The returned array is the EXACT argv that gets passed to spawn — no
 * additional shell processing happens.
 *
 * @param message - The validated render job message.
 * @returns The ffmpeg argv (excluding the `ffmpeg` binary itself).
 */
export function buildFfmpegArgs(message: RenderJobMessage): readonly string[] {
  const { timeline, options } = message
  assertValidTimeline(timeline)
  assertSafePath(options.outputPath, 'options.outputPath')

  const args: string[] = []

  // Per-clip inputs.
  let inputCount = 0
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      if (clip.sourceStart !== undefined && clip.sourceStart > 0) {
        args.push('-ss', String(clip.sourceStart))
      }
      args.push('-t', String(clip.duration))
      args.push('-i', clip.source)
      inputCount++
    }
  }

  // Effects compile into a filter_complex graph. Each effect is keyed by
  // its allow-listed kind — we never accept arbitrary `-vf` strings.
  const filterTokens: string[] = []
  for (const track of timeline.tracks) {
    for (const effect of track.effects ?? []) {
      filterTokens.push(effectToFilter(effect))
    }
  }
  if (filterTokens.length > 0) {
    args.push('-filter_complex', filterTokens.join(','))
  }

  // Codec + container + framerate.
  args.push('-c:v', options.codec)
  args.push('-r', String(options.fps ?? timeline.fps))
  args.push(
    '-s',
    `${options.resolution?.width ?? timeline.resolution.width}x${options.resolution?.height ?? timeline.resolution.height}`,
  )

  if (options.crf !== undefined) {
    if (
      typeof options.crf !== 'number' ||
      !Number.isFinite(options.crf) ||
      options.crf < 0 ||
      options.crf > 63
    ) {
      throw new TypeError('options.crf must be a finite number in [0, 63]')
    }
    args.push('-crf', String(options.crf))
  }

  args.push('-f', options.format)
  args.push('-y', options.outputPath)

  // Sanity assertion — the input count matches the input flag count.
  // This catches programmer errors that would otherwise be silently broken.
  const iFlagCount = args.filter((a) => a === '-i').length
  if (iFlagCount !== inputCount) {
    throw new Error(`internal: argv has ${iFlagCount} -i flags, expected ${inputCount}`)
  }

  return Object.freeze(args)
}
