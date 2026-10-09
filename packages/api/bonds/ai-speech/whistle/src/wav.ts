/**
 * WAV decoding for the Whistle speech provider: parse a RIFF/WAVE container,
 * accept uncompressed integer and 32-bit float PCM at the sample rates real
 * audio equipment and codecs produce ({@link MIN_SOURCE_SAMPLE_RATE}–
 * {@link MAX_SOURCE_SAMPLE_RATE} Hz) and any channel count, mix down to mono,
 * and linearly resample to the 16 kHz float PCM Whistle transcribes.
 * Compressed WAV (μ-law, ADPCM, extensible) is rejected with a typed error —
 * it is never passed through.
 *
 * The parser treats the file as HOSTILE input: RIFF size fields are read
 * unsigned, so a chunk header that declares `0xFFFFFFF8` bytes advances the
 * scan instead of (as a signed int32, `-8`) re-reading the same header
 * forever — a 44-byte file must never hang the event loop on `transcribe()`.
 *
 * @module
 */

import { WHISTLE_SAMPLE_RATE } from './engine.js'

/**
 * Error thrown when audio bytes are not decodable uncompressed WAV.
 * `code` is `not-wav` (not a RIFF/WAVE container), `unsupported-format`
 * (compressed/exotic `fmt ` payload) or `truncated` (missing chunks).
 */
export class WhistleWavError extends Error {
  /** Why the decode failed. */
  readonly code: 'not-wav' | 'unsupported-format' | 'truncated'

  /**
   * Create the error.
   * @param code - The failure kind.
   * @param message - Human-readable message.
   */
  constructor(code: WhistleWavError['code'], message: string) {
    super(message)
    this.name = 'WhistleWavError'
    this.code = code
  }
}

/** A decoded WAV, ready for the engine. */
export interface DecodedWav {
  /** Mono samples at 16 kHz, values in [-1, 1]. */
  samples: Float32Array
  /** Always 16000. */
  sampleRate: number
  /** Duration in seconds. */
  duration: number
  /** The source's original sample rate. */
  sourceSampleRate: number
}

/** RIFF fmt chunk audio formats this decoder accepts. */
const FORMAT_PCM = 0x0001
const FORMAT_FLOAT = 0x0003
/** Formats rejected with a "convert first" message. */
const FORMAT_NAMES: Record<number, string> = {
  0x0006: 'a-law',
  0x0007: 'μ-law',
  0x0011: 'IMA ADPCM',
  0xfffe: 'WAVE_FORMAT_EXTENSIBLE',
}

/**
 * Sample rates this decoder accepts, in Hz. The floor is below every rate a
 * real speech source produces (telephone audio is 8 kHz) and the ceiling above
 * every ADC/codec (DXD tops out at 352.8 kHz): anything outside the range is a
 * corrupt or hostile header. The floor is also the memory bound — the 16 kHz
 * resample below multiplies the decoded samples by `16000 / sourceRate`, so a
 * header claiming 1 Hz would turn a few KB of upload into a multi-gigabyte
 * allocation (a fatal OOM, not a catchable error) on `transcribe()`.
 */
const MIN_SOURCE_SAMPLE_RATE = 4000
/** Highest source sample rate this decoder accepts, in Hz. */
const MAX_SOURCE_SAMPLE_RATE = 384_000

/**
 * Reads a little-endian u16.
 * @param bytes - The WAV bytes.
 * @param offset - Byte offset.
 * @returns The value.
 */
function u16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

/**
 * Reads a little-endian u32 as UNSIGNED. RIFF length and rate fields are
 * unsigned 32-bit; the `<< 24` term sign-extends the top byte, so without the
 * `>>> 0` a size field of `0xFFFFFFF8` reads as `-8` and the chunk scan's
 * `offset = body + size + pad` stops advancing — the same header is then
 * re-parsed forever, an event-loop hang on hostile input.
 * @param bytes - The WAV bytes.
 * @param offset - Byte offset.
 * @returns The value.
 */
function u32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  )
}

/**
 * Linearly resamples mono float samples to the target rate.
 * @param samples - Input samples at `fromRate` Hz.
 * @param fromRate - The input sample rate.
 * @param toRate - The wanted sample rate.
 * @returns Samples at `toRate` Hz.
 */
export function resampleLinear(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return samples
  const ratio = fromRate / toRate
  const outLength = Math.floor(samples.length / ratio)
  const out = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const position = i * ratio
    const index = Math.floor(position)
    const frac = position - index
    const a = samples[index] ?? 0
    const b = samples[index + 1] ?? a
    out[i] = a + (b - a) * frac
  }
  return out
}

/**
 * Streaming linear resampler over float samples: push arbitrary-size chunks
 * at the source rate, receive fixed-size blocks at the target rate.
 */
export class FloatBlockResampler {
  private raw: Float32Array = new Float32Array(0)
  /** Absolute input index of `raw[0]`. */
  private rawStart = 0
  /** Total output samples produced so far. */
  private produced = 0

  /**
   * Creates the resampler.
   * @param fromRate - Source sample rate in Hz.
   * @param toRate - Target sample rate in Hz.
   * @param blockSize - Output samples per emitted block.
   * @throws {Error} When either rate is not a finite, positive number, or
   *   `blockSize` is not a finite, positive number — in every such case the
   *   emit/identity loop's bound never advances, so `push()` would emit
   *   blocks forever inside a single call (an event-loop hang with an
   *   unbounded block array, never a catchable error).
   */
  constructor(
    private readonly fromRate: number,
    private readonly toRate: number,
    private readonly blockSize: number,
  ) {
    for (const [name, rate] of [
      ['fromRate', fromRate],
      ['toRate', toRate],
    ] as const) {
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error(
          `FloatBlockResampler: ${name} must be a finite, positive sample rate (got ${rate})`,
        )
      }
    }
    // The same hang the rate guard exists for, one variable over: a
    // zero/negative blockSize never advances the identity path's `start`
    // (`start += blockSize`) and a NaN one never advances `produced`
    // (`produced += blockSize`), so `push()` emits blocks forever. The
    // provider's own block size is a constant, but this class is exported.
    if (!Number.isFinite(blockSize) || blockSize <= 0) {
      throw new Error(
        `FloatBlockResampler: blockSize must be a finite, positive number of samples (got ${blockSize})`,
      )
    }
  }

  /**
   * Pushes one chunk of source-rate samples.
   * @param chunk - Input samples.
   * @returns Zero or more complete output blocks.
   */
  push(chunk: Float32Array): Float32Array[] {
    if (this.fromRate === this.toRate) {
      // Identity path: no fractional bookkeeping, just fixed-size chopping.
      const blocks: Float32Array[] = []
      let start = 0
      const merged = new Float32Array(this.raw.length + chunk.length)
      merged.set(this.raw)
      merged.set(chunk, this.raw.length)
      while (start + this.blockSize <= merged.length) {
        blocks.push(merged.subarray(start, start + this.blockSize))
        start += this.blockSize
      }
      this.raw = merged.slice(start)
      return blocks
    }
    const ratio = this.fromRate / this.toRate
    const merged = new Float32Array(this.raw.length + chunk.length)
    merged.set(this.raw)
    merged.set(chunk, this.raw.length)
    this.raw = merged
    const blocks: Float32Array[] = []
    for (;;) {
      // The block's last output sample reads input floor((produced + size - 1)
      // * ratio) and needs the sample AFTER it for interpolation.
      const lastNeeded = Math.floor((this.produced + this.blockSize - 1) * ratio) + 1
      if (lastNeeded > this.rawStart + this.raw.length - 1) break
      const block = new Float32Array(this.blockSize)
      for (let i = 0; i < this.blockSize; i++) {
        const position = (this.produced + i) * ratio - this.rawStart
        const index = Math.floor(position)
        const frac = position - index
        const a = this.raw[index] ?? 0
        const b = this.raw[index + 1] ?? a
        block[i] = a + (b - a) * frac
      }
      this.produced += this.blockSize
      const keepFrom = Math.floor(this.produced * ratio) - this.rawStart
      if (keepFrom > 0) {
        this.raw = this.raw.slice(keepFrom)
        this.rawStart += keepFrom
      }
      blocks.push(block)
    }
    return blocks
  }

  /**
   * Emits the remaining output computable from what is buffered, as one
   * final partial block (the last input sample is held for interpolation).
   * @returns The partial block, or null when nothing is buffered.
   */
  flush(): Float32Array | null {
    if (this.raw.length === 0) return null
    const ratio = this.fromRate / this.toRate
    const lastAbsolute = this.rawStart + this.raw.length - 1
    const count = Math.floor(lastAbsolute / ratio) - this.produced + 1
    if (count <= 0) return null
    const block = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const position = (this.produced + i) * ratio - this.rawStart
      const index = Math.floor(position)
      const frac = position - index
      const a = this.raw[index] ?? 0
      const b = this.raw[index + 1] ?? a
      block[i] = a + (b - a) * frac
    }
    this.produced += count
    this.raw = new Float32Array(0)
    return block
  }
}

/**
 * Decodes uncompressed WAV bytes (PCM integer or float) to mono 16 kHz float
 * samples for the Whistle engine. Source sample rates outside
 * {@link MIN_SOURCE_SAMPLE_RATE}–{@link MAX_SOURCE_SAMPLE_RATE} Hz are
 * rejected: no real audio lives there, and a hostile rate would scale the
 * 16 kHz resample into a fatal allocation.
 * @param audio - The WAV file bytes.
 * @returns The decoded audio.
 * @throws {WhistleWavError} When the bytes are not uncompressed WAV — decode
 *   browser recordings (webm/m4a/mp3) to WAV/PCM first, e.g. with ffmpeg.
 */
export function decodeWavToMono16k(audio: Uint8Array | Buffer): DecodedWav {
  const bytes = new Uint8Array(
    audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer,
  )
  if (
    bytes.length < 44 ||
    bytes[0] !== 0x52 ||
    bytes[1] !== 0x49 ||
    bytes[2] !== 0x46 ||
    bytes[3] !== 0x46
  ) {
    throw new WhistleWavError('not-wav', 'audio is not a RIFF/WAVE file')
  }
  if (bytes[8] !== 0x57 || bytes[9] !== 0x41 || bytes[10] !== 0x56 || bytes[11] !== 0x45) {
    throw new WhistleWavError('not-wav', 'RIFF container is not a WAVE file')
  }

  let offset = 12
  let audioFormat = 0
  let channels = 0
  let sampleRate = 0
  let bitsPerSample = 0
  let data: Uint8Array | null = null

  while (offset + 8 <= bytes.length) {
    const chunkId = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    )
    const chunkSize = u32(bytes, offset + 4)
    const body = offset + 8
    if (chunkId === 'fmt ') {
      if (body + 16 > bytes.length) {
        throw new WhistleWavError('truncated', 'fmt chunk is truncated')
      }
      audioFormat = u16(bytes, body)
      channels = u16(bytes, body + 2)
      sampleRate = u32(bytes, body + 4)
      bitsPerSample = u16(bytes, body + 14)
    } else if (chunkId === 'data') {
      const end = Math.min(body + chunkSize, bytes.length)
      data = bytes.subarray(body, end)
    }
    offset = body + chunkSize + (chunkSize % 2)
  }

  if (audioFormat === 0 || channels === 0 || sampleRate === 0) {
    throw new WhistleWavError('truncated', 'WAV file has no fmt chunk')
  }
  if (data === null || data.length === 0) {
    throw new WhistleWavError('truncated', 'WAV file has no data chunk')
  }
  const formatName = FORMAT_NAMES[audioFormat]
  if (audioFormat !== FORMAT_PCM && audioFormat !== FORMAT_FLOAT) {
    throw new WhistleWavError(
      'unsupported-format',
      `WAV audio format ${formatName ?? String(audioFormat)} is compressed or exotic — decode to uncompressed PCM WAV first (e.g. ffmpeg -i in.webm out.wav)`,
    )
  }
  if (audioFormat === FORMAT_FLOAT && bitsPerSample !== 32) {
    throw new WhistleWavError(
      'unsupported-format',
      `float WAV must be 32-bit, got ${bitsPerSample}-bit`,
    )
  }
  if (bitsPerSample !== 8 && bitsPerSample !== 16 && bitsPerSample !== 24 && bitsPerSample !== 32) {
    throw new WhistleWavError(
      'unsupported-format',
      `unsupported PCM bit depth ${bitsPerSample} (8/16/24/32-bit integer or 32-bit float)`,
    )
  }
  if (sampleRate < MIN_SOURCE_SAMPLE_RATE || sampleRate > MAX_SOURCE_SAMPLE_RATE) {
    // A rate outside every real ADC/codec is a corrupt or hostile header, and
    // trusting it is not harmless: the resample below scales the decoded
    // samples by 16000/sourceRate, so a header claiming 1 Hz turns a tiny
    // upload into a fatal out-of-memory allocation instead of the typed error.
    throw new WhistleWavError(
      'unsupported-format',
      `WAV sample rate ${sampleRate} Hz is outside the supported range (${MIN_SOURCE_SAMPLE_RATE}–${MAX_SOURCE_SAMPLE_RATE} Hz)`,
    )
  }

  const bytesPerSample = bitsPerSample / 8
  const frameCount = Math.floor(data.length / (bytesPerSample * channels))
  const mono = new Float32Array(frameCount)

  if (audioFormat === FORMAT_FLOAT) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    for (let frame = 0; frame < frameCount; frame++) {
      let sum = 0
      for (let channel = 0; channel < channels; channel++) {
        sum += view.getFloat32((frame * channels + channel) * 4, true)
      }
      mono[frame] = sum / channels
    }
  } else {
    for (let frame = 0; frame < frameCount; frame++) {
      let sum = 0
      for (let channel = 0; channel < channels; channel++) {
        const base = (frame * channels + channel) * bytesPerSample
        switch (bitsPerSample) {
          case 8:
            sum += (data[base]! - 128) / 128
            break
          case 16: {
            let value = data[base]! | (data[base + 1]! << 8)
            if (value >= 0x8000) value -= 0x10000
            sum += value / 0x8000
            break
          }
          case 24: {
            let value = data[base]! | (data[base + 1]! << 8) | (data[base + 2]! << 16)
            if (value >= 0x800000) value -= 0x1000000
            sum += value / 0x800000
            break
          }
          default: {
            let value = u32(data, base)
            if (value >= 0x80000000) value -= 0x100000000
            sum += value / 0x80000000
            break
          }
        }
      }
      mono[frame] = sum / channels
    }
  }

  const samples = resampleLinear(mono, sampleRate, WHISTLE_SAMPLE_RATE)
  return {
    samples,
    sampleRate: WHISTLE_SAMPLE_RATE,
    duration: samples.length / WHISTLE_SAMPLE_RATE,
    sourceSampleRate: sampleRate,
  }
}
