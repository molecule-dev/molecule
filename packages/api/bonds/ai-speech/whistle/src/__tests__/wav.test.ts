import { describe, expect, it } from 'vitest'

import { WHISTLE_SAMPLE_RATE } from '../engine.js'
import { decodeWavToMono16k, FloatBlockResampler, WhistleWavError } from '../wav.js'

/**
 * Asserts `decode` throws a {@link WhistleWavError} with EXACTLY `code` — the
 * `code` is the documented contract callers branch on. Asserting inside a bare
 * `catch` block cannot fail when nothing is thrown at all, and asserting only
 * the error CLASS cannot fail when the code is reclassified, so both halves
 * live here.
 * @param decode - The decode call expected to throw.
 * @param code - The failure kind the input must produce.
 */
function expectWavError(decode: () => unknown, code: WhistleWavError['code']): void {
  let caught: unknown
  try {
    decode()
  } catch (error) {
    caught = error
  }
  expect(caught).toBeInstanceOf(WhistleWavError)
  expect((caught as WhistleWavError).code).toBe(code)
}

/**
 * Builds a minimal WAV file with per-channel float samples in [-1, 1].
 * @param options - Format and samples.
 * @returns WAV bytes.
 */
function buildWav(options: {
  audioFormat?: number
  channels: number
  sampleRate: number
  bitsPerSample: number
  samples: Float32Array[]
}): Uint8Array {
  const { channels, sampleRate, bitsPerSample, samples } = options
  const audioFormat = options.audioFormat ?? 0x0001
  const frames = samples[0].length
  const bytesPerSample = bitsPerSample / 8
  const dataBytes = frames * channels * bytesPerSample
  const out = new Uint8Array(44 + dataBytes)
  const view = new DataView(out.buffer)
  const write = (text: string, at: number): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i))
  }
  write('RIFF', 0)
  view.setUint32(4, 36 + dataBytes, true)
  write('WAVE', 8)
  write('fmt ', 12)
  view.setUint32(16, 16, true)
  view.setUint16(20, audioFormat, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, (sampleRate * channels * bytesPerSample) | 0, true)
  view.setUint16(32, channels * bytesPerSample, true)
  view.setUint16(34, bitsPerSample, true)
  write('data', 36)
  view.setUint32(40, dataBytes, true)
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const at = 44 + (frame * channels + channel) * bytesPerSample
      const value = samples[channel][frame]
      if (audioFormat === 0x0003) {
        view.setFloat32(at, value, true)
      } else {
        const full = bitsPerSample === 8 ? 128 : 1 << (bitsPerSample - 1)
        const scaled =
          bitsPerSample === 8
            ? Math.round(value * 128) + 128
            : Math.max(-full, Math.min(full - 1, Math.round(value * full)))
        if (bitsPerSample === 8) view.setUint8(at, scaled)
        else if (bitsPerSample === 16) view.setInt16(at, scaled, true)
        else if (bitsPerSample === 24) {
          view.setUint8(at, scaled & 0xff)
          view.setUint8(at + 1, (scaled >> 8) & 0xff)
          view.setUint8(at + 2, (scaled >> 16) & 0xff)
        } else view.setInt32(at, scaled, true)
      }
    }
  }
  return out
}

describe('decodeWavToMono16k', () => {
  it('decodes 16-bit mono 16 kHz WAV to the exact float samples', () => {
    const wav = buildWav({
      channels: 1,
      sampleRate: 16000,
      bitsPerSample: 16,
      samples: [new Float32Array([0.5, -1, 0, 0.25])],
    })
    const decoded = decodeWavToMono16k(wav)
    expect(decoded.sampleRate).toBe(WHISTLE_SAMPLE_RATE)
    expect(decoded.sourceSampleRate).toBe(16000)
    expect(decoded.samples).toHaveLength(4)
    expect(decoded.samples[0]).toBeCloseTo(0.5, 4)
    expect(decoded.samples[1]).toBe(-1)
    expect(decoded.samples[2]).toBe(0)
    expect(decoded.samples[3]).toBeCloseTo(0.25, 4)
    expect(decoded.duration).toBeCloseTo(4 / 16000, 6)
  })

  it('mixes stereo down to mono by averaging channels', () => {
    const wav = buildWav({
      channels: 2,
      sampleRate: 16000,
      bitsPerSample: 16,
      samples: [new Float32Array([1, 0.5]), new Float32Array([0, -0.5])],
    })
    const decoded = decodeWavToMono16k(wav)
    expect(decoded.samples).toHaveLength(2)
    expect(decoded.samples[0]).toBeCloseTo(0.5, 4)
    expect(decoded.samples[1]).toBeCloseTo(0, 4)
  })

  it('resamples 32 kHz input to 16 kHz', () => {
    const samples = new Float32Array(3200)
    for (let i = 0; i < samples.length; i++) samples[i] = Math.sin((2 * Math.PI * 100 * i) / 32000)
    const wav = buildWav({ channels: 1, sampleRate: 32000, bitsPerSample: 16, samples: [samples] })
    const decoded = decodeWavToMono16k(wav)
    expect(decoded.samples).toHaveLength(1600)
    expect(decoded.duration).toBeCloseTo(0.1, 4)
  })

  it('decodes 32-bit float WAV', () => {
    const wav = buildWav({
      audioFormat: 0x0003,
      channels: 1,
      sampleRate: 16000,
      bitsPerSample: 32,
      samples: [new Float32Array([0.123, -0.987])],
    })
    const decoded = decodeWavToMono16k(wav)
    expect(decoded.samples[0]).toBeCloseTo(0.123, 6)
    expect(decoded.samples[1]).toBeCloseTo(-0.987, 6)
  })

  it('decodes 8-bit unsigned and 24-bit PCM', () => {
    const wav8 = buildWav({
      channels: 1,
      sampleRate: 16000,
      bitsPerSample: 8,
      samples: [new Float32Array([0.5, -1])],
    })
    const d8 = decodeWavToMono16k(wav8)
    expect(d8.samples[0]).toBeCloseTo(0.5, 2)

    const wav24 = buildWav({
      channels: 1,
      sampleRate: 16000,
      bitsPerSample: 24,
      samples: [new Float32Array([0.5, -0.5])],
    })
    const d24 = decodeWavToMono16k(wav24)
    expect(d24.samples[0]).toBeCloseTo(0.5, 3)
    expect(d24.samples[1]).toBeCloseTo(-0.5, 3)
  })

  it('throws not-wav for non-RIFF bytes', () => {
    // Both inputs are under the 44-byte RIFF floor. The second one used to be
    // asserted only inside a `catch` block — which passes silently if the
    // decoder ever stops throwing for it — so the throw and the code are both
    // asserted, failably, here.
    expectWavError(() => decodeWavToMono16k(new Uint8Array([1, 2, 3, 4])), 'not-wav')
    expectWavError(
      () => decodeWavToMono16k(new TextEncoder().encode('ID3 tag data here padding padding pad!')),
      'not-wav',
    )
  })

  it('throws unsupported-format for compressed WAV (μ-law)', () => {
    const wav = buildWav({
      audioFormat: 0x0007,
      channels: 1,
      sampleRate: 8000,
      bitsPerSample: 8,
      samples: [new Float32Array(8)],
    })
    expect(() => decodeWavToMono16k(wav)).toThrow(/μ-law/)
    expectWavError(() => decodeWavToMono16k(wav), 'unsupported-format')
  })

  it('throws truncated when the data chunk is missing', () => {
    const wav = buildWav({
      channels: 1,
      sampleRate: 16000,
      bitsPerSample: 16,
      samples: [new Float32Array(4)],
    })
    // Cut INSIDE the container (past the 12-byte RIFF/WAVE header) rather than
    // below it: the old `length < 44` floor classified every cut-off file as
    // `not-wav`, so no input could reach the documented `truncated` code at
    // all — this input (a valid header, chunks ending before any `data`) is
    // the one the code contract promises as `truncated`.
    const headless = wav.subarray(0, 36) // header + fmt chunk, no data chunk
    expectWavError(() => decodeWavToMono16k(headless), 'truncated')

    // A full-length file whose `data` chunk header was overwritten (a hostile
    // or corrupt chunk list) is missing its data too, not its container.
    const noDataChunk = new Uint8Array(wav)
    noDataChunk.set([0x4a, 0x55, 0x4e, 0x4b], 36) // 'JUNK'
    expectWavError(() => decodeWavToMono16k(noDataChunk), 'truncated')
  })

  it('advances past a chunk whose size field is 0xFFFFFFF8 instead of looping forever', () => {
    // RIFF size fields are UNSIGNED 32-bit. Read as a signed int32, 0xFFFFFFF8
    // is -8, and the scan's `offset = body + size + pad` then lands back on the
    // same header — a 60-byte file hung `transcribe()`'s event loop forever.
    // The JUNK chunk trails the data chunk, so decoding its samples proves the
    // scan moved past the hostile header to the end of the file.
    const bytes = new Uint8Array(60)
    const view = new DataView(bytes.buffer)
    const write = (text: string, at: number): void => {
      for (let i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i))
    }
    write('RIFF', 0)
    view.setUint32(4, 52, true) // 60 - 8
    write('WAVE', 8)
    write('fmt ', 12)
    view.setUint32(16, 16, true)
    view.setUint16(20, 0x0001, true) // PCM
    view.setUint16(22, 1, true) // mono
    view.setUint32(24, 16000, true)
    view.setUint32(28, 32000, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    write('data', 36)
    view.setUint32(40, 8, true)
    // 4 PCM16 samples: 0.5, -0.5, 1, 0
    const values = [0.5, -0.5, 1, 0]
    values.forEach((value, i) => view.setInt16(44 + i * 2, Math.round(value * 0x8000), true))
    write('JUNK', 52)
    view.setUint32(56, 0xfffffff8, true)

    const decoded = decodeWavToMono16k(bytes)
    expect(decoded.samples).toHaveLength(4)
    expect(decoded.samples[0]).toBeCloseTo(0.5, 4)
    expect(decoded.samples[1]).toBeCloseTo(-0.5, 4)
  })

  it('rejects a sample-rate field outside the real-audio range with unsupported-format', () => {
    // 0xFFFFFFFF reads as -1 through a signed u32; the resampler then computed
    // a negative output length and crashed with a raw RangeError instead of the
    // typed error. Unsigned, it is 4294967295 Hz — no ADC produces that, and a
    // low hostile rate (e.g. 1 Hz) would scale the 16 kHz resample into a
    // fatal out-of-memory allocation. Either way: typed rejection, no decode.
    const wav = buildWav({
      channels: 1,
      sampleRate: 0xffffffff,
      bitsPerSample: 16,
      samples: [new Float32Array(4)],
    })
    expect(() => decodeWavToMono16k(wav)).toThrow(/sample rate/)
    expectWavError(() => decodeWavToMono16k(wav), 'unsupported-format')
    try {
      decodeWavToMono16k(wav)
    } catch (error) {
      expect(error).not.toBeInstanceOf(RangeError)
    }
  })
})

describe('FloatBlockResampler', () => {
  it('passes through at identity rate as fixed-size blocks', () => {
    const resampler = new FloatBlockResampler(16000, 16000, 100)
    const blocks = resampler.push(new Float32Array(250))
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toHaveLength(100)
    const more = resampler.push(new Float32Array(50))
    expect(more).toHaveLength(1) // 50 leftover + 50 = one more block
    expect(resampler.flush()).toBeNull()
  })

  it('resamples 48 kHz to 16 kHz with sample continuity', () => {
    const resampler = new FloatBlockResampler(48000, 16000, 100)
    const input = new Float32Array(4800) // 0.1 s → 1600 outputs
    for (let i = 0; i < input.length; i++) input[i] = i / 4800
    const blocks = resampler.push(input)
    expect(blocks.reduce((n, b) => n + b.length, 0)).toBe(1600)
    // output 3k is exactly input 9k (3:1)
    const flat = blocks[0]
    expect(flat[3]).toBeCloseTo(9 / 4800, 6)
    expect(resampler.flush()).toBeNull()
  })

  it('flush emits the buffered remainder as a final partial block', () => {
    const resampler = new FloatBlockResampler(16000, 16000, 100)
    resampler.push(new Float32Array(130))
    const tail = resampler.flush()
    expect(tail).not.toBeNull()
    expect(tail).toHaveLength(30)
    expect(resampler.flush()).toBeNull()
  })

  it('refuses a blockSize that would make push() emit blocks forever', () => {
    // A zero/negative blockSize never advances the identity path's `start`
    // and a NaN one never advances the resampling path's `produced`, so
    // push() would loop forever inside a single call — the same hang the
    // rate guard exists for, one variable over. The constructor must reject
    // it the way it rejects a non-positive rate, not leave the hang armed.
    expect(() => new FloatBlockResampler(16000, 16000, 0)).toThrow(/blockSize/)
    expect(() => new FloatBlockResampler(48000, 16000, 0)).toThrow(/blockSize/)
    expect(() => new FloatBlockResampler(16000, 16000, -100)).toThrow(/blockSize/)
    expect(() => new FloatBlockResampler(48000, 16000, Number.NaN)).toThrow(/blockSize/)
    expect(() => new FloatBlockResampler(48000, 16000, Number.POSITIVE_INFINITY)).toThrow(
      /blockSize/,
    )
  })
})
