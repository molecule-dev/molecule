/**
 * PCM16 / WAV helpers: the self-hosted speech servers all want 16 kHz mono
 * PCM16, and none of them resamples reliably, so the bond converts the audio
 * itself before sending it.
 *
 * @module
 */

/** The sample rate every self-hosted speech server in this family expects. */
export const TARGET_SAMPLE_RATE = 16_000

/** Decoded PCM16 audio. */
export interface DecodedWav {
  /** Sample rate of the decoded audio in Hz. */
  sampleRate: number
  /** Number of interleaved channels in the source file. */
  channels: number
  /** Mono PCM16 samples (multi-channel input is averaged down). */
  samples: Int16Array
}

/**
 * Checks whether the bytes start with a RIFF/WAVE header.
 *
 * @param bytes - Audio bytes.
 * @returns True for a WAV container.
 */
export function isWav(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE'
}

/**
 * Reads `length` bytes at `offset` as ASCII.
 *
 * @param bytes - Source bytes.
 * @param offset - Start offset.
 * @param length - Number of bytes.
 * @returns The ASCII string.
 */
function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length))
}

/**
 * Decodes an uncompressed 16-bit PCM WAV file to mono samples.
 *
 * @param bytes - The WAV file bytes.
 * @returns The sample rate, source channel count and mono samples.
 * @throws {Error} When the bytes are not a 16-bit PCM WAV file.
 */
export function decodeWav(bytes: Uint8Array): DecodedWav {
  if (!isWav(bytes)) {
    throw new Error(
      'Audio is not a WAV file. This speech server accepts 16-bit PCM WAV only — convert m4a/webm/mp3 to WAV (e.g. with ffmpeg) before transcribing.',
    )
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 12
  let format = 0
  let channels = 0
  let sampleRate = 0
  let bitsPerSample = 0
  let data: Uint8Array | null = null
  while (offset + 8 <= bytes.length) {
    const id = ascii(bytes, offset, 4)
    const size = view.getUint32(offset + 4, true)
    const body = offset + 8
    if (id === 'fmt ') {
      format = view.getUint16(body, true)
      channels = view.getUint16(body + 2, true)
      sampleRate = view.getUint32(body + 4, true)
      bitsPerSample = view.getUint16(body + 14, true)
    } else if (id === 'data') {
      data = bytes.subarray(body, Math.min(body + size, bytes.length))
    }
    offset = body + size + (size % 2)
  }
  // 0xFFFE = WAVE_FORMAT_EXTENSIBLE, which still carries plain PCM for 16-bit audio.
  if ((format !== 1 && format !== 0xfffe) || bitsPerSample !== 16 || channels < 1 || !data) {
    throw new Error(
      `Unsupported WAV encoding (format ${format}, ${bitsPerSample}-bit, ${channels} channel(s)). Only 16-bit PCM WAV is supported.`,
    )
  }
  const frames = Math.floor(data.length / (2 * channels))
  const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const samples = new Int16Array(frames)
  for (let frame = 0; frame < frames; frame++) {
    let sum = 0
    for (let channel = 0; channel < channels; channel++) {
      sum += dataView.getInt16((frame * channels + channel) * 2, true)
    }
    samples[frame] = Math.round(sum / channels)
  }
  return { sampleRate, channels, samples }
}

/**
 * Resamples mono PCM16 with linear interpolation.
 *
 * @param samples - Mono input samples.
 * @param fromRate - Input sample rate in Hz.
 * @param toRate - Output sample rate in Hz.
 * @returns Resampled samples (the input itself when the rates match).
 */
export function resample(samples: Int16Array, fromRate: number, toRate: number): Int16Array {
  const resampler = new Pcm16Resampler(fromRate, toRate)
  const head = resampler.pushSamples(samples)
  const tail = resampler.flushSamples()
  const out = new Int16Array(head.length + tail.length)
  out.set(head)
  out.set(tail, head.length)
  return out
}

/**
 * Encodes mono PCM16 samples as a WAV file.
 *
 * @param samples - Mono samples.
 * @param sampleRate - Sample rate in Hz.
 * @returns The WAV file bytes.
 */
export function encodeWav(samples: Int16Array, sampleRate: number): Uint8Array {
  const out = new Uint8Array(44 + samples.length * 2)
  const view = new DataView(out.buffer)
  const writeAscii = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) out[offset + i] = text.charCodeAt(i)
  }
  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, samples[i], true)
  return out
}

/**
 * Converts any 16-bit PCM WAV into a 16 kHz mono WAV.
 *
 * @param bytes - The source WAV bytes.
 * @returns A 16 kHz mono 16-bit PCM WAV.
 */
export function toTargetWav(bytes: Uint8Array): Uint8Array {
  const { sampleRate, samples } = decodeWav(bytes)
  return encodeWav(resample(samples, sampleRate, TARGET_SAMPLE_RATE), TARGET_SAMPLE_RATE)
}

/**
 * Decodes a WAV file into 16 kHz mono PCM16 little-endian bytes.
 *
 * @param bytes - The source WAV bytes.
 * @returns Raw 16 kHz mono PCM16 LE bytes.
 */
export function wavToTargetPcm(bytes: Uint8Array): Uint8Array {
  const { sampleRate, samples } = decodeWav(bytes)
  return samplesToBytes(resample(samples, sampleRate, TARGET_SAMPLE_RATE))
}

/**
 * Serializes samples as PCM16 little-endian bytes.
 *
 * @param samples - PCM16 samples.
 * @returns Little-endian bytes.
 */
export function samplesToBytes(samples: Int16Array): Uint8Array {
  const out = new Uint8Array(samples.length * 2)
  const view = new DataView(out.buffer)
  for (let i = 0; i < samples.length; i++) view.setInt16(i * 2, samples[i], true)
  return out
}

/**
 * Streaming PCM16 little-endian resampler (linear interpolation). Keeps the
 * state a chunked stream needs: an odd trailing byte and the fractional read
 * position carry over to the next chunk, so chunk boundaries add no clicks.
 */
export class Pcm16Resampler {
  private readonly step: number
  private tail = new Int16Array(0)
  private position = 0
  private carry: number | null = null

  /**
   * Create a resampler.
   *
   * @param fromRate - Input sample rate in Hz.
   * @param toRate - Output sample rate in Hz.
   */
  constructor(
    private readonly fromRate: number,
    private readonly toRate: number,
  ) {
    if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) {
      throw new Error(`Invalid sample rate: ${fromRate} → ${toRate}`)
    }
    this.step = fromRate / toRate
  }

  /**
   * Resample one chunk of PCM16 LE bytes.
   *
   * @param chunk - Raw bytes (may split a sample; the odd byte is carried).
   * @returns Resampled PCM16 LE bytes (possibly empty).
   */
  push(chunk: Uint8Array): Uint8Array {
    return samplesToBytes(this.pushSamples(this.decode(chunk)))
  }

  /**
   * Emit whatever the last chunk left pending.
   *
   * @returns Remaining PCM16 LE bytes.
   */
  flush(): Uint8Array {
    return samplesToBytes(this.flushSamples())
  }

  /**
   * Resample decoded samples.
   *
   * @param samples - Mono samples.
   * @returns Resampled samples.
   */
  pushSamples(samples: Int16Array): Int16Array {
    if (this.fromRate === this.toRate) return samples
    const buffer = new Int16Array(this.tail.length + samples.length)
    buffer.set(this.tail)
    buffer.set(samples, this.tail.length)
    const out: number[] = []
    for (;;) {
      const index = Math.floor(this.position)
      if (index + 1 >= buffer.length) break
      const fraction = this.position - index
      out.push(Math.round(buffer[index] * (1 - fraction) + buffer[index + 1] * fraction))
      this.position += this.step
    }
    const drop = Math.min(Math.floor(this.position), Math.max(buffer.length - 1, 0))
    this.tail = buffer.slice(drop)
    this.position -= drop
    return Int16Array.from(out)
  }

  /**
   * Emit the final samples held back for interpolation.
   *
   * @returns Remaining samples.
   */
  flushSamples(): Int16Array {
    if (this.fromRate === this.toRate) return new Int16Array(0)
    const out: number[] = []
    while (this.tail.length > 0 && this.position <= this.tail.length - 1) {
      out.push(this.tail[Math.floor(this.position)])
      this.position += this.step
    }
    this.tail = new Int16Array(0)
    this.position = 0
    return Int16Array.from(out)
  }

  /**
   * Decode LE bytes into samples, carrying an odd trailing byte.
   *
   * @param chunk - Raw bytes.
   * @returns Decoded samples.
   */
  private decode(chunk: Uint8Array): Int16Array {
    let bytes = chunk
    if (this.carry !== null) {
      bytes = new Uint8Array(chunk.length + 1)
      bytes[0] = this.carry
      bytes.set(chunk, 1)
      this.carry = null
    }
    if (bytes.length % 2 === 1) {
      this.carry = bytes[bytes.length - 1]
      bytes = bytes.subarray(0, bytes.length - 1)
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const samples = new Int16Array(bytes.length / 2)
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true)
    return samples
  }
}

/**
 * Converts a PCM16 LE stream at any sample rate to 16 kHz and re-chunks it
 * into fixed-size blocks (the last block may be shorter).
 *
 * @param audio - Raw PCM16 LE mono chunks.
 * @param sampleRate - Input sample rate in Hz.
 * @param blockBytes - Output block size in bytes (even).
 * @yields {Uint8Array} 16 kHz PCM16 LE blocks of `blockBytes` bytes.
 */
export async function* toTargetBlocks(
  audio: AsyncIterable<Uint8Array>,
  sampleRate: number,
  blockBytes: number,
): AsyncGenerator<Uint8Array> {
  const resampler = new Pcm16Resampler(sampleRate, TARGET_SAMPLE_RATE)
  let pending = new Uint8Array(0)
  const append = (bytes: Uint8Array): void => {
    if (bytes.length === 0) return
    const next = new Uint8Array(pending.length + bytes.length)
    next.set(pending)
    next.set(bytes, pending.length)
    pending = next
  }
  for await (const chunk of audio) {
    append(sampleRate === TARGET_SAMPLE_RATE ? chunk : resampler.push(chunk))
    while (pending.length >= blockBytes) {
      yield pending.slice(0, blockBytes)
      pending = pending.slice(blockBytes)
    }
  }
  if (sampleRate !== TARGET_SAMPLE_RATE) append(resampler.flush())
  // An odd trailing byte cannot be a sample; drop it.
  const usable = pending.length - (pending.length % 2)
  if (usable > 0) yield pending.slice(0, usable)
}

/**
 * Encodes bytes as base64.
 *
 * @param bytes - Raw bytes.
 * @returns Base64 text.
 */
export function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64')
}
