import { describe, expect, it } from 'vitest'

import { buildFfmpegArgs, sanitizeAudioPath } from '../ffmpegCommand.js'
import type { AudioSession } from '../types.js'

describe('sanitizeAudioPath', () => {
  it('returns the value unchanged for plain ASCII paths', () => {
    expect(sanitizeAudioPath('/var/audio/clip.wav', 'p')).toBe('/var/audio/clip.wav')
  })

  it('accepts http(s) URLs', () => {
    expect(sanitizeAudioPath('https://cdn.x/song.mp3', 'p')).toBe('https://cdn.x/song.mp3')
  })

  it('throws on non-string input', () => {
    expect(() => sanitizeAudioPath(42 as unknown, 'p')).toThrow(/must be a non-empty string/)
    expect(() => sanitizeAudioPath(undefined, 'p')).toThrow(/must be a non-empty string/)
    expect(() => sanitizeAudioPath(null, 'p')).toThrow(/must be a non-empty string/)
  })

  it('throws on empty string', () => {
    expect(() => sanitizeAudioPath('', 'p')).toThrow(/non-empty/)
  })

  it('throws on NUL byte (filter-graph injection defense)', () => {
    expect(() => sanitizeAudioPath('safe\x00malicious', 'p')).toThrow(/control character/)
  })

  it('throws on newline (would break -filter_complex script tokenization)', () => {
    expect(() => sanitizeAudioPath('safe\nmalicious', 'p')).toThrow(/control character/)
  })

  it('throws on DEL (\\x7f) and other C0 controls', () => {
    expect(() => sanitizeAudioPath('safe\x7fbad', 'p')).toThrow(/control character/)
    expect(() => sanitizeAudioPath('safe\x07bad', 'p')).toThrow(/control character/) // BEL
    expect(() => sanitizeAudioPath('safe\x1fbad', 'p')).toThrow(/control character/) // unit sep
  })

  it('includes the supplied label in the error message', () => {
    expect(() => sanitizeAudioPath('a\nb', 'channel 3 clip audioUrl')).toThrow(
      /channel 3 clip audioUrl/,
    )
  })

  it('allows path-like ASCII (slashes, dots, dashes, underscores)', () => {
    expect(sanitizeAudioPath('./local/file_01-final.wav', 'p')).toBe('./local/file_01-final.wav')
  })
})

describe('buildFfmpegArgs — silent session', () => {
  it('synthesizes an anullsrc input for sessions with no active channels', () => {
    const session: AudioSession = {
      channels: [],
      duration: 5,
    }
    const cmd = buildFfmpegArgs(
      session,
      { format: 'wav', sampleRate: 44100, channels: 2 },
      '/tmp/out.wav',
    )
    const argv = cmd.args.join(' ')
    expect(argv).toContain('-f lavfi')
    expect(argv).toContain('anullsrc=channel_layout=stereo')
    expect(argv).toContain('sample_rate=44100')
  })

  it('uses mono layout when channels=1', () => {
    const cmd = buildFfmpegArgs(
      { channels: [], duration: 1 },
      { format: 'wav', sampleRate: 22050, channels: 1 },
      '/tmp/out.wav',
    )
    expect(cmd.args.join(' ')).toContain('anullsrc=channel_layout=mono')
  })
})

describe('buildFfmpegArgs — active channels', () => {
  it('emits one -i input per clip in channel order', () => {
    const session: AudioSession = {
      channels: [
        {
          id: 'ch1',
          clips: [
            { audioUrl: '/a.wav', startTime: 0, duration: 1 },
            { audioUrl: '/b.wav', startTime: 1, duration: 1 },
          ],
        },
      ],
      duration: 2,
    }
    const cmd = buildFfmpegArgs(
      session,
      { format: 'wav', sampleRate: 44100, channels: 2 },
      '/tmp/out.wav',
    )
    const inputs = cmd.args.filter((a, i, arr) => arr[i - 1] === '-i')
    expect(inputs).toEqual(['/a.wav', '/b.wav'])
  })

  it('skips muted channels entirely (no inputs emitted)', () => {
    const session: AudioSession = {
      channels: [
        {
          id: 'ch1',
          muted: true,
          clips: [{ audioUrl: '/a.wav', startTime: 0, duration: 1 }],
        },
      ],
      duration: 2,
    }
    const cmd = buildFfmpegArgs(
      session,
      { format: 'wav', sampleRate: 44100, channels: 2 },
      '/tmp/out.wav',
    )
    expect(cmd.args).not.toContain('/a.wav')
  })

  it('skips channels with no clips', () => {
    const session: AudioSession = {
      channels: [{ id: 'empty', clips: [] }],
      duration: 2,
    }
    const cmd = buildFfmpegArgs(
      session,
      { format: 'wav', sampleRate: 44100, channels: 2 },
      '/tmp/out.wav',
    )
    expect(cmd.args.join(' ')).toContain('anullsrc') // falls back to silent
  })

  it('uses amix when multiple channels are active', () => {
    const session: AudioSession = {
      channels: [
        { id: 'a', clips: [{ audioUrl: '/a.wav', startTime: 0, duration: 1 }] },
        { id: 'b', clips: [{ audioUrl: '/b.wav', startTime: 0, duration: 1 }] },
      ],
      duration: 1,
    }
    const cmd = buildFfmpegArgs(
      session,
      { format: 'wav', sampleRate: 44100, channels: 2 },
      '/tmp/out.wav',
    )
    expect(cmd.filterGraph).toContain('amix=inputs=2')
  })

  it('applies master volume filter when set to a non-1 value', () => {
    const session: AudioSession = {
      channels: [{ id: 'a', clips: [{ audioUrl: '/a.wav', startTime: 0, duration: 1 }] }],
      duration: 1,
      masterVolume: 0.5,
    }
    const cmd = buildFfmpegArgs(
      session,
      { format: 'wav', sampleRate: 44100, channels: 2 },
      '/tmp/out.wav',
    )
    expect(cmd.filterGraph).toContain('volume=0.5')
  })

  it('does NOT apply master volume filter when value is 1', () => {
    const session: AudioSession = {
      channels: [{ id: 'a', clips: [{ audioUrl: '/a.wav', startTime: 0, duration: 1 }] }],
      duration: 1,
      masterVolume: 1,
    }
    const cmd = buildFfmpegArgs(
      session,
      { format: 'wav', sampleRate: 44100, channels: 2 },
      '/tmp/out.wav',
    )
    expect(cmd.filterGraph).not.toContain('_master')
  })
})

describe('buildFfmpegArgs — format codecs', () => {
  const session: AudioSession = {
    channels: [{ id: 'a', clips: [{ audioUrl: '/a.wav', startTime: 0, duration: 1 }] }],
    duration: 1,
  }

  it('wav → pcm_s16le', () => {
    const cmd = buildFfmpegArgs(
      session,
      { format: 'wav', sampleRate: 44100, channels: 2 },
      '/tmp/out.wav',
    )
    expect(cmd.args.join(' ')).toContain('-c:a pcm_s16le')
    expect(cmd.args.join(' ')).toContain('-f wav')
  })

  it('flac → -c:a flac', () => {
    const cmd = buildFfmpegArgs(
      session,
      { format: 'flac', sampleRate: 44100, channels: 2 },
      '/tmp/out.flac',
    )
    expect(cmd.args.join(' ')).toContain('-c:a flac')
  })

  it('mp3 → libmp3lame with bitrate', () => {
    const cmd = buildFfmpegArgs(
      session,
      { format: 'mp3', sampleRate: 44100, channels: 2, bitrate: '192k' },
      '/tmp/out.mp3',
    )
    const argv = cmd.args.join(' ')
    expect(argv).toContain('libmp3lame')
    expect(argv).toContain('192k')
  })
})

describe('buildFfmpegArgs — argv shape', () => {
  it('starts with safe defaults (-y, -hide_banner, -loglevel error)', () => {
    const cmd = buildFfmpegArgs(
      { channels: [], duration: 1 },
      { format: 'wav', sampleRate: 44100, channels: 2 },
      '/tmp/out.wav',
    )
    expect(cmd.args.slice(0, 4)).toEqual(['-y', '-hide_banner', '-loglevel', 'error'])
  })

  it('ends with the sanitized output path', () => {
    const cmd = buildFfmpegArgs(
      { channels: [], duration: 1 },
      { format: 'wav', sampleRate: 44100, channels: 2 },
      '/tmp/out.wav',
    )
    expect(cmd.args[cmd.args.length - 1]).toBe('/tmp/out.wav')
  })

  it('rejects unsafe output paths via sanitizeAudioPath', () => {
    expect(() =>
      buildFfmpegArgs(
        { channels: [], duration: 1 },
        { format: 'wav', sampleRate: 44100, channels: 2 },
        '/tmp/out\n.wav',
      ),
    ).toThrow(/outputPath: contains a control character/)
  })

  it('rejects unsafe clip audioUrl via sanitizeAudioPath', () => {
    expect(() =>
      buildFfmpegArgs(
        {
          channels: [
            { id: 'ch1', clips: [{ audioUrl: '/a\nbad.wav', startTime: 0, duration: 1 }] },
          ],
          duration: 1,
        },
        { format: 'wav', sampleRate: 44100, channels: 2 },
        '/tmp/out.wav',
      ),
    ).toThrow(/channel ch1 clip audioUrl/)
  })

  it('always sets -ar (sample rate) and -ac (channels)', () => {
    const cmd = buildFfmpegArgs(
      { channels: [], duration: 1 },
      { format: 'wav', sampleRate: 48000, channels: 1 },
      '/tmp/out.wav',
    )
    const argv = cmd.args.join(' ')
    expect(argv).toContain('-ar 48000')
    expect(argv).toContain('-ac 1')
  })
})
