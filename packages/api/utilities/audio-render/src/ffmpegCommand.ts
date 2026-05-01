/**
 * Build the ffmpeg argument vector for an offline mixdown.
 *
 * Why a pure builder instead of `fluent-ffmpeg`: every clip path is
 * caller-controlled (it might come from an HTTP body), so the command
 * line *must* be assembled from a `string[]` argv that's passed directly
 * to `child_process.spawn` — never to a shell. Even with that argv-style
 * call, paths still need sanitising because ffmpeg interprets a leading
 * `-` as a flag, and a path containing a literal newline can break our
 * `-filter_complex` script.
 *
 * The builder is exported separately from {@link processAudioRenderJob}
 * so unit tests can assert the exact argv without spawning ffmpeg.
 *
 * @module
 */

import type {
  AudioChannel,
  AudioClip,
  AudioEffect,
  AudioRenderFormat,
  AudioRenderOptions,
  AudioSession,
} from './types.js'

/**
 * Result of {@link buildFfmpegArgs} — the exact argv to spawn plus the
 * resolved filter graph (handy for diagnostics and tests).
 */
export interface FfmpegCommand {
  /** Argument vector — element 0 is the first arg, NOT the binary name. */
  args: string[]
  /** The fully assembled `-filter_complex` script. */
  filterGraph: string
  /** Final output stream label fed into `-map`. */
  outputStreamLabel: string
}

/** Set of characters we refuse in any caller-controlled string. */
// eslint-disable-next-line no-control-regex
const UNSAFE_PATH_CHARS = /[\x00-\x1f\x7f]/

/**
 * Reject paths/URLs containing NUL, newline, or any other control
 * character. These can't appear in legitimate filesystem paths or URLs;
 * if one shows up it's almost certainly an injection attempt or a bug
 * upstream, and ffmpeg's filter-graph parser would mis-tokenize it.
 *
 * @param value - The caller-supplied path or URL.
 * @param label - Diagnostic label used in the thrown error.
 * @returns The validated value, unchanged.
 * @throws {Error} If `value` contains a control character.
 */
export const sanitizeAudioPath = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label}: must be a non-empty string`)
  }
  if (UNSAFE_PATH_CHARS.test(value)) {
    throw new Error(`${label}: contains a control character`)
  }
  return value
}

/**
 * Map a {@link AudioEffect} to an ffmpeg `-af`/filter-graph fragment.
 * Returns `null` for unknown effects so the caller can skip them.
 *
 * @param effect - The effect to translate.
 * @returns A filter fragment like `volume=2`, or `null` if `effect.kind`
 *          is not recognised.
 */
const effectToFilter = (effect: AudioEffect): string | null => {
  const params = effect.params ?? {}
  switch (effect.kind) {
    case 'gain': {
      const gain = params['gain'] ?? params['value']
      if (gain === undefined) return null
      return `volume=${escapeFilterValue(gain)}`
    }
    case 'lowpass': {
      const f = params['frequency'] ?? params['f'] ?? 1000
      return `lowpass=f=${escapeFilterValue(f)}`
    }
    case 'highpass': {
      const f = params['frequency'] ?? params['f'] ?? 1000
      return `highpass=f=${escapeFilterValue(f)}`
    }
    case 'reverb': {
      // ffmpeg has `aecho` as a portable reverb-ish primitive.
      const delays = params['delays'] ?? '60'
      const decays = params['decays'] ?? '0.4'
      return `aecho=0.8:0.9:${escapeFilterValue(delays)}:${escapeFilterValue(decays)}`
    }
    default:
      return null
  }
}

/**
 * Filter-graph values must not contain `,`, `;`, `[`, `]`, `:`, `=` or
 * `\` unless escaped. We restrict to a numeric-or-simple-token charset
 * up-front and reject anything else.
 *
 * @param value - The value to embed verbatim in a filter expression.
 */
const escapeFilterValue = (value: string | number): string => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Filter value must be finite, received ${value}`)
    }
    return value.toString()
  }
  if (!/^[A-Za-z0-9._+-]+$/.test(value)) {
    throw new Error(`Filter value must match /^[A-Za-z0-9._+-]+$/, received "${value}"`)
  }
  return value
}

/**
 * Build the per-channel filter sub-graph: pad/trim each clip to its
 * timeline slot, sum clips into one stream, then apply volume/pan/effects.
 *
 * @param channel - The channel to render.
 * @param channelInputIndex - The starting `-i` input index occupied by this
 *                            channel's clips.
 * @returns Object containing filter fragments and the output label.
 */
const buildChannelFilters = (
  channel: AudioChannel,
  channelInputIndex: number,
): { filters: string[]; outLabel: string; inputCount: number } => {
  const filters: string[] = []
  const clipLabels: string[] = []

  channel.clips.forEach((clip: AudioClip, clipIdx) => {
    const inputIdx = channelInputIndex + clipIdx
    const clipLabel = `c${channel.id}_${clipIdx}`
    const startMs = Math.max(0, Math.round(clip.startTime * 1000))
    const durationS = Math.max(0, clip.duration)

    // adelay pads the clip's leading silence; atrim cuts to duration; asetpts resets PTS.
    const parts: string[] = []
    if (clip.sourceOffset && clip.sourceOffset > 0) {
      parts.push(`atrim=start=${escapeFilterValue(clip.sourceOffset)}`)
    }
    parts.push(`atrim=duration=${escapeFilterValue(durationS)}`)
    parts.push('asetpts=PTS-STARTPTS')
    if (startMs > 0) {
      parts.push(`adelay=${startMs}|${startMs}`)
    }

    filters.push(`[${inputIdx}:a]${parts.join(',')}[${clipLabel}]`)
    clipLabels.push(`[${clipLabel}]`)
  })

  const channelMixedLabel = `ch${channel.id}_mixed`
  const inputCount = channel.clips.length

  if (clipLabels.length === 0) {
    // Empty channel — no contribution. Caller filters this case before mixing.
    return { filters, outLabel: '', inputCount }
  }

  if (clipLabels.length === 1) {
    // Skip amix when there's only one clip — it would be a no-op and
    // some ffmpeg builds warn about single-input amix.
    filters.push(`${clipLabels[0]}anull[${channelMixedLabel}]`)
  } else {
    filters.push(
      `${clipLabels.join('')}amix=inputs=${clipLabels.length}:duration=longest:dropout_transition=0[${channelMixedLabel}]`,
    )
  }

  // Apply volume + pan + effects, in that order.
  const postFilters: string[] = []
  if (channel.volume !== undefined && channel.volume !== 1) {
    postFilters.push(`volume=${escapeFilterValue(channel.volume)}`)
  }
  if (channel.pan !== undefined && channel.pan !== 0) {
    // pan=stereo|c0=...|c1=... — keep simple linear law.
    const left = Math.max(0, 1 - channel.pan)
    const right = Math.max(0, 1 + channel.pan)
    postFilters.push(
      `pan=stereo|c0=${escapeFilterValue(left.toFixed(4))}*c0|c1=${escapeFilterValue(right.toFixed(4))}*c1`,
    )
  }
  for (const effect of channel.effects ?? []) {
    const fragment = effectToFilter(effect)
    if (fragment) postFilters.push(fragment)
  }

  if (postFilters.length === 0) {
    return { filters, outLabel: channelMixedLabel, inputCount }
  }

  const finalLabel = `ch${channel.id}_out`
  filters.push(`[${channelMixedLabel}]${postFilters.join(',')}[${finalLabel}]`)
  return { filters, outLabel: finalLabel, inputCount }
}

/**
 * Construct the full ffmpeg argv for an {@link AudioSession}.
 *
 * @param session - The multi-track session to render.
 * @param options - Resolved render options (caller has already merged defaults).
 * @param outputPath - Destination file path.
 * @returns The argv plus the filter-graph string for diagnostics.
 * @throws {Error} If any caller-controlled string contains a control char.
 */
export const buildFfmpegArgs = (
  session: AudioSession,
  options: Required<Pick<AudioRenderOptions, 'format' | 'sampleRate' | 'channels'>> & {
    bitrate?: string
  },
  outputPath: string,
): FfmpegCommand => {
  const safeOutput = sanitizeAudioPath(outputPath, 'outputPath')

  const args: string[] = ['-y', '-hide_banner', '-loglevel', 'error']

  // Collect inputs in channel-then-clip order so indices line up with the filter graph.
  let inputIndex = 0
  const filterFragments: string[] = []
  const activeChannelLabels: string[] = []

  for (const channel of session.channels) {
    if (channel.muted) continue
    if (channel.clips.length === 0) continue

    for (const clip of channel.clips) {
      args.push('-i', sanitizeAudioPath(clip.audioUrl, `channel ${channel.id} clip audioUrl`))
    }

    const { filters, outLabel, inputCount } = buildChannelFilters(channel, inputIndex)
    inputIndex += inputCount
    filterFragments.push(...filters)
    if (outLabel) activeChannelLabels.push(`[${outLabel}]`)
  }

  let outputLabel: string

  if (activeChannelLabels.length === 0) {
    // Silent session — synthesise an anullsrc of the requested duration.
    args.push(
      '-f',
      'lavfi',
      '-t',
      escapeFilterValue(session.duration),
      '-i',
      `anullsrc=channel_layout=${options.channels === 1 ? 'mono' : 'stereo'}:sample_rate=${escapeFilterValue(options.sampleRate)}`,
    )
    filterFragments.push(`[${inputIndex}:a]anull[silent]`)
    outputLabel = 'silent'
  } else if (activeChannelLabels.length === 1) {
    const inner = activeChannelLabels[0]!.slice(1, -1)
    outputLabel = inner
  } else {
    outputLabel = 'mix'
    filterFragments.push(
      `${activeChannelLabels.join('')}amix=inputs=${activeChannelLabels.length}:duration=longest:dropout_transition=0[${outputLabel}]`,
    )
  }

  // Master volume.
  if (session.masterVolume !== undefined && session.masterVolume !== 1) {
    const next = `${outputLabel}_master`
    filterFragments.push(
      `[${outputLabel}]volume=${escapeFilterValue(session.masterVolume)}[${next}]`,
    )
    outputLabel = next
  }

  const filterGraph = filterFragments.join(';')
  if (filterGraph) {
    args.push('-filter_complex', filterGraph)
    args.push('-map', `[${outputLabel}]`)
  }

  args.push('-ar', escapeFilterValue(options.sampleRate))
  args.push('-ac', escapeFilterValue(options.channels))

  pushFormatArgs(args, options.format, options.bitrate)
  args.push(safeOutput)

  return { args, filterGraph, outputStreamLabel: outputLabel }
}

/**
 * Push `-c:a` (and friends) for the requested output format.
 * @param args
 * @param format
 * @param bitrate
 */
const pushFormatArgs = (args: string[], format: AudioRenderFormat, bitrate?: string): void => {
  switch (format) {
    case 'wav':
      args.push('-c:a', 'pcm_s16le', '-f', 'wav')
      return
    case 'mp3':
      args.push('-c:a', 'libmp3lame', '-f', 'mp3')
      if (bitrate) args.push('-b:a', escapeFilterValue(bitrate))
      return
    case 'flac':
      args.push('-c:a', 'flac', '-f', 'flac')
      return
  }
}
