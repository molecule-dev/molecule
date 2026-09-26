/**
 * Self-hosted Tesseract implementation of OcrProvider.
 *
 * Runs Tesseract (Apache-2.0, code and traineddata weights) in a WASM worker
 * thread inside your own process — no vendor account, no per-call egress after
 * the first use of a language downloads its traineddata. Workers are created
 * lazily per language (LSTM engine) and reused across calls; `dispose()`
 * terminates them.
 *
 * @module
 */

import { createWorker, type Worker } from 'tesseract.js'

import type { OcrInput, OcrOptions, OcrProvider, OcrResult } from '@molecule/api-ocr'

import type { TesseractOcrConfig } from './types.js'

/**
 * OCR provider backed by self-hosted Tesseract.
 */
class TesseractOcrProvider implements OcrProvider {
  readonly name = 'tesseract'
  private readonly workers = new Map<string, Promise<Worker>>()

  /**
   * Creates a new Tesseract OCR provider.
   *
   * @param config - Default language and where traineddata comes from.
   */
  constructor(private readonly config: TesseractOcrConfig = {}) {}

  /**
   * Recognize text in one image.
   *
   * @param input - The image bytes and MIME type.
   * @param options - Language hint as Tesseract traineddata code(s), e.g. `eng`
   *   or `eng+deu` — a BCP-47 tag like `en` fails traineddata lookup.
   * @returns One page with Tesseract's text and its own mean confidence.
   */
  async recognize(input: OcrInput, options?: OcrOptions): Promise<OcrResult> {
    const language = options?.language ?? this.config.language ?? 'eng'
    const worker = await this.worker(language)
    const { data } = await worker.recognize(Buffer.from(input.data))
    const text = data.text ?? ''
    return {
      text,
      pages: [
        {
          pageNumber: 1,
          text,
          ...(typeof data.confidence === 'number' ? { confidence: data.confidence / 100 } : {}),
        },
      ],
    }
  }

  /**
   * Terminates every worker thread this provider started.
   */
  async dispose(): Promise<void> {
    const pending = [...this.workers.values()]
    this.workers.clear()
    await Promise.allSettled(
      pending.map(async (p) => {
        try {
          await (await p).terminate()
        } catch (_error) {
          // Intentional noop: a worker that already died is disposed as far as
          // the caller cares — dispose() must not fail because one did.
        }
      }),
    )
  }

  /**
   * The worker for one language, created once and reused. A failed creation is
   * dropped so the next call retries instead of caching the rejection.
   *
   * @param language - Tesseract language code(s).
   * @returns The running worker.
   */
  private worker(language: string): Promise<Worker> {
    const existing = this.workers.get(language)
    if (existing) return existing
    // OEM 1 = LSTM-only: faster and more accurate than the legacy engine on
    // the tessdata_fast/best packs.
    const created = createWorker(language, 1, {
      ...(this.config.langPath ? { langPath: this.config.langPath } : {}),
      ...(this.config.cachePath ? { cachePath: this.config.cachePath } : {}),
      ...(this.config.gzip !== undefined ? { gzip: this.config.gzip } : {}),
    })
    this.workers.set(language, created)
    created.catch((_error: unknown) => {
      // Intentional noop: a worker whose creation failed is dropped so the
      // next call retries from scratch; the rejection already surfaced to the
      // caller that triggered it.
      this.workers.delete(language)
    })
    return created
  }
}

/**
 * Creates a self-hosted Tesseract OCR provider.
 *
 * @param config - Default language and traineddata source.
 * @returns An `OcrProvider` backed by Tesseract in a worker thread.
 */
export function createProvider(config?: TesseractOcrConfig): OcrProvider {
  return new TesseractOcrProvider(config)
}

/** Lazily-initialized provider singleton. */
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
