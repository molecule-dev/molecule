/**
 * TeleOCR implementation of OcrProvider.
 *
 * Recognizes text by sending the image, with TeleOCR's verbatim `text` task
 * prompt, to a TeleOCR server through an injected `@molecule/api-ai` provider —
 * typically `@molecule/api-ai-local` pointed at `vllm serve` with the
 * `TeleOCR_vllm` plugin installed. One image per call, greedy decoding
 * (`temperature: 0`), one page back with no confidence score.
 *
 * @module
 */

import type { AIProvider } from '@molecule/api-ai'
import { requireProvider as requireAiProvider } from '@molecule/api-ai'
import type { OcrInput, OcrOptions, OcrPage, OcrProvider, OcrResult } from '@molecule/api-ocr'

import { TeleOcrTruncatedError } from './errors.js'
import { TELEOCR_PROMPTS, TELEOCR_SYSTEM_PROMPT } from './prompt.js'
import type { TeleOcrConfig, TeleOcrEnv } from './types.js'

/** The served model name used when neither config nor `TELEOCR_MODEL` sets one. */
export const DEFAULT_TELEOCR_MODEL = 'StarDoc-AI/TeleOCR'

/** The reference implementation's output budget (`max_new_tokens`). */
export const DEFAULT_TELEOCR_MAX_OUTPUT_TOKENS = 4096

/**
 * OCR provider backed by the TeleOCR document-parsing model.
 */
class TeleOcrProvider implements OcrProvider {
  readonly name = 'teleocr'

  /**
   * Creates a new TeleOCR provider.
   *
   * @param config - Which AI provider reaches the server, the served model name, output budget.
   */
  constructor(private readonly config: TeleOcrConfig = {}) {}

  /**
   * Recognize text in one image.
   *
   * @param input - The image bytes and MIME type.
   * @param _options - Ignored: TeleOCR has no language slot in its prompt (zh/en only).
   * @returns One page with the model's transcription.
   */
  async recognize(input: OcrInput, _options?: OcrOptions): Promise<OcrResult> {
    const text = await this.ask(input)
    const page: OcrPage = { pageNumber: 1, text }
    return { text, pages: [page] }
  }

  /**
   * Sends one image with the `text` task prompt and returns the full answer.
   *
   * @param input - The image to transcribe.
   * @returns The model's text output, trimmed.
   */
  private async ask(input: OcrInput): Promise<string> {
    const ai: AIProvider = this.config.ai ?? requireAiProvider()
    const env = process.env as TeleOcrEnv
    const model = this.config.model ?? (env.TELEOCR_MODEL || DEFAULT_TELEOCR_MODEL)
    const maxTokens = this.config.maxOutputTokens ?? DEFAULT_TELEOCR_MAX_OUTPUT_TOKENS
    let answer = ''
    let outputTokens = 0
    for await (const event of ai.chat({
      system: TELEOCR_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', mediaType: input.mimeType, data: toBase64(input.data) },
            { type: 'text', text: TELEOCR_PROMPTS.text },
          ],
        },
      ],
      model,
      temperature: 0,
      maxTokens,
    })) {
      if (event.type === 'text') answer += event.content
      else if (event.type === 'usage' || event.type === 'done') {
        outputTokens = Math.max(outputTokens, event.usage.outputTokens)
      } else if (event.type === 'error') {
        throw Object.assign(new Error(`TeleOCR model error: ${event.message}`), {
          errorKey: event.errorKey,
        })
      }
    }
    const text = answer.trim()
    // The AI core reports no finish reason; a completion that used the whole
    // budget is the `finish_reason: length` case.
    if (outputTokens >= maxTokens) throw new TeleOcrTruncatedError(text, maxTokens)
    return text
  }
}

/**
 * Encodes image bytes as base64 (the AI core's image block carries raw base64;
 * `@molecule/api-ai-local` builds the data URL).
 *
 * @param data - The image bytes.
 * @returns Base64 text.
 */
function toBase64(data: Uint8Array): string {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64')
}

/**
 * Creates a TeleOCR provider.
 *
 * @param config - Which AI provider reaches the TeleOCR server, and the served model name.
 * @returns An `OcrProvider` backed by TeleOCR.
 */
export function createProvider(config?: TeleOcrConfig): OcrProvider {
  return new TeleOcrProvider(config)
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
