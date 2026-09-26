/**
 * Language-model implementation of OcrProvider.
 *
 * Recognizes text by sending the image to any vision-capable `@molecule/api-ai`
 * provider — a hosted model (GPT, Gemini, Claude, GLM, …) or a self-hosted one
 * behind `@molecule/api-ai-local`. One image per call; the model's full answer
 * is the page text. A model does not produce a calibrated confidence score, so
 * the result carries none — see the package remarks.
 *
 * @module
 */

import type { AIProvider } from '@molecule/api-ai'
import { requireProvider as requireAiProvider } from '@molecule/api-ai'
import type { OcrInput, OcrOptions, OcrPage, OcrProvider, OcrResult } from '@molecule/api-ocr'

import { systemPrompt, userPrompt } from './prompt.js'
import type { LlmOcrConfig } from './types.js'

/** Rough output-token ceiling per call, sized from the image byte length. */
const MAX_TOKENS_PER_BYTE = 0.5

/**
 * OCR provider backed by a vision language model.
 */
class LlmOcrProvider implements OcrProvider {
  readonly name = 'llm'

  /**
   * Creates a new language-model OCR provider.
   *
   * @param config - Which AI provider/model to use, default language, extra instructions.
   */
  constructor(private readonly config: LlmOcrConfig = {}) {}

  /**
   * Recognize text in one image.
   *
   * @param input - The image bytes and MIME type.
   * @param options - Language hint (falls back to the config's `language`).
   * @returns One page with the model's transcription.
   */
  async recognize(input: OcrInput, options?: OcrOptions): Promise<OcrResult> {
    const language = options?.language ?? this.config.language
    const answer = await this.ask(input, language)
    const page: OcrPage = { pageNumber: 1, text: answer }
    return { text: answer, pages: [page] }
  }

  /**
   * Sends one image to the model and returns its full text answer.
   *
   * @param input - The image to transcribe.
   * @param language - Optional language hint.
   * @returns The model's text output, trimmed of transcription fences.
   */
  private async ask(input: OcrInput, language?: string): Promise<string> {
    const ai: AIProvider = this.config.ai ?? requireAiProvider()
    let answer = ''
    for await (const event of ai.chat({
      system: systemPrompt(this.config.instructions),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', mediaType: input.mimeType, data: toBase64(input.data) },
            { type: 'text', text: userPrompt(language) },
          ],
        },
      ],
      ...(this.config.model ? { model: this.config.model } : {}),
      // No default temperature: several vision models (the catalog's
      // `rejectsTemperature` entries) 400 on the PARAMETER, not the value —
      // and transcription needs no sampling control anyway.
      ...(this.config.temperature !== undefined ? { temperature: this.config.temperature } : {}),
      maxTokens:
        this.config.maxOutputTokens ??
        Math.max(1024, Math.min(32_000, Math.ceil(input.data.length * MAX_TOKENS_PER_BYTE))),
    })) {
      if (event.type === 'text') answer += event.content
      else if (event.type === 'error') {
        throw Object.assign(new Error(`OCR model error: ${event.message}`), {
          errorKey: event.errorKey,
        })
      }
    }
    return stripFences(answer.trim())
  }
}

/**
 * Encodes image bytes as base64 (the AI core's image block carries raw base64;
 * provider bonds build their own data URLs).
 *
 * @param data - The image bytes.
 * @returns Base64 text.
 */
function toBase64(data: Uint8Array): string {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64')
}

/**
 * Removes the markdown fences a model adds despite instructions.
 *
 * @param text - The model's answer.
 * @returns The bare transcription.
 */
function stripFences(text: string): string {
  const fenced = /^```[a-zA-Z]*\n([\s\S]*?)\n```$/.exec(text)
  return fenced ? fenced[1] : text
}

/**
 * Creates a language-model OCR provider.
 *
 * @param config - Which AI provider/model to use and how to prompt it.
 * @returns An `OcrProvider` backed by a vision language model.
 */
export function createProvider(config?: LlmOcrConfig): OcrProvider {
  return new LlmOcrProvider(config)
}

/** Lazily-initialized provider singleton, using the bonded `ai` provider on first use. */
let _provider: OcrProvider | null = null
/**
 * The provider implementation.
 */
export const provider: OcrProvider = new Proxy({} as OcrProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
