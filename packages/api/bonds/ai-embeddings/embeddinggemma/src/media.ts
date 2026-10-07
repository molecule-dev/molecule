/**
 * Media input loading for the EmbeddingGemma 2 provider.
 *
 * Transformers.js decodes images in Node (via sharp) but NOT audio — its
 * `load_audio` needs the browser's `AudioContext`. So audio is decoded here from
 * WAV, mixed down to mono and resampled to the 16 kHz the audio encoder expects.
 * Other audio containers (MP3, OGG, …) must be converted to WAV by the caller.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'

import type { EmbedMediaSource } from '@molecule/api-ai-embeddings'

/** Sample rate the EmbeddingGemma 2 audio encoder was trained on. */
export const AUDIO_SAMPLE_RATE = 16_000

/** Decoded PCM audio. */
export interface DecodedAudio {
  /** Mono samples in [-1, 1]. */
  samples: Float32Array
  /** Samples per second. */
  sampleRate: number
}

/**
 * Split a media source into its data and (optional) declared MIME type.
 *
 * @param source - The media source.
 * @returns The bytes or URL/path, plus the MIME type when the caller gave one.
 */
export function unwrapMediaSource(source: EmbedMediaSource): {
  data: Uint8Array | string
  mimeType?: string
} {
  if (typeof source === 'string' || source instanceof Uint8Array) return { data: source }
  return { data: source.data, mimeType: source.mimeType }
}

/**
 * Read a media source into bytes: bytes as-is, `http(s)://` via `fetch`, anything
 * else as a local file path.
 *
 * @param data - Bytes, URL, or file path.
 * @returns The bytes.
 * @throws {Error} When the URL answers with a non-2xx status.
 */
export async function readMediaBytes(data: Uint8Array | string): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data
  if (/^https?:\/\//i.test(data)) {
    const response = await fetch(data)
    if (!response.ok) {
      throw new Error(`EmbeddingGemma: fetching media ${data} failed with HTTP ${response.status}`)
    }
    return new Uint8Array(await response.arrayBuffer())
  }
  return new Uint8Array(await readFile(data))
}

/**
 * Read one sample as a float in [-1, 1].
 *
 * @param view - The buffer view.
 * @param offset - Byte offset of the sample.
 * @param format - 1 = integer PCM, 3 = IEEE float.
 * @param bits - Bits per sample.
 * @returns The sample value.
 */
function readSample(view: DataView, offset: number, format: number, bits: number): number {
  if (format === 3)
    return bits === 64 ? view.getFloat64(offset, true) : view.getFloat32(offset, true)
  switch (bits) {
    case 8:
      return (view.getUint8(offset) - 128) / 128
    case 16:
      return view.getInt16(offset, true) / 32_768
    case 24: {
      const value =
        view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getInt8(offset + 2) << 16)
      return value / 8_388_608
    }
    default:
      return view.getInt32(offset, true) / 2_147_483_648
  }
}

/**
 * Decode a RIFF/WAVE file (integer PCM 8/16/24/32-bit or 32/64-bit float, any
 * channel count) into mono samples.
 *
 * @param bytes - The WAV file bytes.
 * @returns Mono samples and their sample rate.
 * @throws {Error} When the bytes are not a WAV file this decoder supports.
 */
export function decodeWav(bytes: Uint8Array): DecodedAudio {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tag = (offset: number): string => String.fromCharCode(...bytes.subarray(offset, offset + 4))
  if (bytes.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') {
    throw new Error(
      'EmbeddingGemma: audio must be a WAV file (RIFF/WAVE) in Node — convert MP3/OGG/etc. to WAV first.',
    )
  }

  let format = 0
  let channels = 0
  let sampleRate = 0
  let bits = 0
  let dataStart = -1
  let dataLength = 0
  for (let offset = 12; offset + 8 <= bytes.byteLength;) {
    const id = tag(offset)
    const size = view.getUint32(offset + 4, true)
    if (id === 'fmt ') {
      format = view.getUint16(offset + 8, true)
      channels = view.getUint16(offset + 10, true)
      sampleRate = view.getUint32(offset + 12, true)
      bits = view.getUint16(offset + 22, true)
      // WAVE_FORMAT_EXTENSIBLE: the real format is the first two bytes of the sub-format GUID.
      if (format === 0xfffe && size >= 26) format = view.getUint16(offset + 32, true)
    } else if (id === 'data') {
      dataStart = offset + 8
      dataLength = Math.min(size, bytes.byteLength - dataStart)
      break
    }
    offset += 8 + size + (size % 2)
  }

  const supported =
    (format === 1 && [8, 16, 24, 32].includes(bits)) || (format === 3 && [32, 64].includes(bits))
  if (!supported || channels < 1 || sampleRate < 1 || dataStart < 0) {
    throw new Error(
      `EmbeddingGemma: unsupported WAV encoding (format ${format}, ${bits}-bit, ${channels} channel(s)) — use integer PCM or 32-bit float.`,
    )
  }

  const bytesPerSample = bits / 8
  const frameSize = bytesPerSample * channels
  const frames = Math.floor(dataLength / frameSize)
  const samples = new Float32Array(frames)
  for (let frame = 0; frame < frames; frame++) {
    let sum = 0
    for (let channel = 0; channel < channels; channel++) {
      sum += readSample(
        view,
        dataStart + frame * frameSize + channel * bytesPerSample,
        format,
        bits,
      )
    }
    samples[frame] = sum / channels
  }
  return { samples, sampleRate }
}

/**
 * Resample mono audio by linear interpolation.
 *
 * @param audio - The decoded audio.
 * @param targetRate - Output sample rate.
 * @returns Samples at `targetRate`.
 */
export function resample(audio: DecodedAudio, targetRate: number): Float32Array {
  if (audio.sampleRate === targetRate) return audio.samples
  const ratio = audio.sampleRate / targetRate
  const length = Math.floor(audio.samples.length / ratio)
  const out = new Float32Array(length)
  const last = audio.samples.length - 1
  for (let i = 0; i < length; i++) {
    const position = i * ratio
    const index = Math.floor(position)
    const fraction = position - index
    const next = audio.samples[Math.min(index + 1, last)] ?? 0
    out[i] = (audio.samples[index] ?? 0) * (1 - fraction) + next * fraction
  }
  return out
}

/**
 * Load an audio source as 16 kHz mono samples, ready for the audio encoder.
 *
 * @param source - WAV bytes, a WAV URL / file path, or the object form.
 * @returns 16 kHz mono samples.
 * @throws {Error} When the source declares a non-WAV MIME type or is not a supported WAV.
 */
export async function loadAudio(source: EmbedMediaSource): Promise<Float32Array> {
  const { data, mimeType } = unwrapMediaSource(source)
  if (mimeType && !/^audio\/(wav|wave|x-wav|vnd\.wave)$/i.test(mimeType)) {
    throw new Error(
      `EmbeddingGemma: audio must be WAV in Node (got ${mimeType}) — convert it to WAV first.`,
    )
  }
  return resample(decodeWav(await readMediaBytes(data)), AUDIO_SAMPLE_RATE)
}
