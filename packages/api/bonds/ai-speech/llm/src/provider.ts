/**
 * Language-model implementation of AISpeechProvider.
 *
 * Transcribes by sending the audio to any audio-capable `@molecule/api-ai`
 * chat model as an `audio` content block. Batch only: no streaming, no
 * timings. With `diarize: true` the model is asked to label speakers line by
 * line — a best-effort text labelling, not acoustic diarization.
 *
 * @module
 */

import type { AIProvider } from '@molecule/api-ai'
import { requireProvider as requireAiProvider } from '@molecule/api-ai'
import type {
  AISpeechProvider,
  TranscribeParams,
  TranscribeResult,
  TranscriptionSegment,
} from '@molecule/api-ai-speech'

import { systemPrompt, userPrompt } from './prompt.js'
import type { LlmSpeechConfig } from './types.js'

/** Audio MIME types by file extension. */
const MEDIA_TYPES: Record<string, string> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  mpga: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  webm: 'audio/webm',
  flac: 'audio/flac',
}

/** Output-token ceiling per call, sized from the audio byte length (~1 token per 64 bytes). */
const MAX_TOKENS_PER_BYTE = 1 / 64

/**
 * Picks the audio MIME type from a filename.
 *
 * @param filename - Filename hint (defaults to WAV when absent or unknown).
 * @returns The MIME type.
 */
export function audioMediaType(filename: string | undefined): string {
  const extension = filename?.split('.').pop()?.toLowerCase() ?? ''
  return MEDIA_TYPES[extension] ?? 'audio/wav'
}

/**
 * Parses `speaker_<n>: text` lines into labelled segments.
 *
 * @param transcript - The model's diarized answer.
 * @returns The segments (start = end = 0 — the model gives no timings) and the
 *   transcript with labels removed, or `null` when no line carried a label.
 */
export function parseSpeakerLines(
  transcript: string,
): { segments: TranscriptionSegment[]; text: string } | null {
  const segments: TranscriptionSegment[] = []
  for (const line of transcript.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const match = /^\**\s*speaker[_\s-]?(\d+)\s*\**\s*:\s*(.*)$/i.exec(trimmed)
    if (match) {
      segments.push({
        id: segments.length,
        start: 0,
        end: 0,
        text: match[2].trim(),
        speaker: `speaker_${Number(match[1])}`,
      })
    } else if (segments.length > 0) {
      segments[segments.length - 1].text += ` ${trimmed}`
    } else {
      segments.push({ id: 0, start: 0, end: 0, text: trimmed })
    }
  }
  if (!segments.some((segment) => segment.speaker !== undefined)) return null
  return { segments, text: segments.map((segment) => segment.text).join('\n') }
}

/**
 * Speech provider backed by an audio-capable chat model.
 */
class LlmSpeechProvider implements AISpeechProvider {
  readonly name = 'llm'

  /**
   * Creates a new language-model speech provider.
   *
   * @param config - Which AI provider/model to use, default language, extra instructions.
   */
  constructor(private readonly config: LlmSpeechConfig = {}) {}

  /**
   * Transcribe one audio file.
   *
   * @param params - Audio bytes, filename hint, language / prompt hints, `diarize`.
   * @returns The transcript; with `diarize`, `segments` carry `speaker` labels (no timings).
   */
  async transcribe(params: TranscribeParams): Promise<TranscribeResult> {
    const format = params.responseFormat ?? 'json'
    if (format === 'srt' || format === 'vtt') {
      throw new Error(
        `The llm speech provider cannot produce '${format}' — a chat model returns no timings`,
      )
    }
    const language = params.language ?? this.config.language
    const ai: AIProvider = this.config.ai ?? requireAiProvider()
    const bytes = new Uint8Array(
      params.audio.buffer,
      params.audio.byteOffset,
      params.audio.byteLength,
    )
    let answer = ''
    for await (const event of ai.chat({
      system: systemPrompt({
        ...(params.diarize ? { diarize: true } : {}),
        ...(params.maxSpeakers !== undefined ? { maxSpeakers: params.maxSpeakers } : {}),
        ...(this.config.instructions ? { instructions: this.config.instructions } : {}),
      }),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'audio', mediaType: audioMediaType(params.filename), data: toBase64(bytes) },
            { type: 'text', text: userPrompt(language, params.prompt) },
          ],
        },
      ],
      ...((params.model ?? this.config.model) ? { model: params.model ?? this.config.model } : {}),
      // No default temperature: several models (the catalog's `rejectsTemperature`
      // entries) 400 on the PARAMETER, not the value.
      ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
      maxTokens:
        this.config.maxOutputTokens ??
        Math.max(1024, Math.min(32_000, Math.ceil(bytes.length * MAX_TOKENS_PER_BYTE))),
    })) {
      if (event.type === 'text') answer += event.content
      else if (event.type === 'error') {
        throw Object.assign(new Error(`Transcription model error: ${event.message}`), {
          errorKey: event.errorKey,
        })
      }
    }
    const transcript = stripFences(answer.trim())
    if (params.diarize) {
      const parsed = parseSpeakerLines(transcript)
      if (parsed) {
        return {
          text: parsed.text,
          segments: parsed.segments,
          ...(language ? { language } : {}),
        }
      }
    }
    return { text: transcript, ...(language ? { language } : {}) }
  }
}

/**
 * Encodes audio bytes as base64 (the AI core's audio block carries raw base64).
 *
 * @param data - The audio bytes.
 * @returns Base64 text.
 */
function toBase64(data: Uint8Array): string {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64')
}

/**
 * Removes the markdown fences a model adds despite instructions.
 *
 * @param text - The model's answer.
 * @returns The bare transcript.
 */
function stripFences(text: string): string {
  const fenced = /^```[a-zA-Z]*\n([\s\S]*?)\n```$/.exec(text)
  return fenced ? fenced[1] : text
}

/**
 * Creates a language-model speech provider.
 *
 * @param config - Which AI provider/model to use and how to prompt it.
 * @returns An `AISpeechProvider` backed by an audio-capable chat model.
 */
export function createProvider(config?: LlmSpeechConfig): AISpeechProvider {
  return new LlmSpeechProvider(config)
}

/** Lazily-initialized provider singleton, using the bonded `ai` provider on first use. */
let _provider: AISpeechProvider | null = null
/**
 * The provider implementation.
 */
export const provider: AISpeechProvider = new Proxy({} as AISpeechProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
