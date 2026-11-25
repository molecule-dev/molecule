/**
 * pdf.js document text provider for `@molecule/api-document-text`.
 *
 * Extracts the text of a PDF document IN this process — pdf.js (Apache-2.0)
 * through `unpdf`'s serverless build, no vendor, no browser, no network. It
 * is an ordinary bond: swap it for `@molecule/api-document-text-molecule`
 * (molecule.dev hosted) without changing code that calls the core.
 *
 * @module
 */

import { extractText, getDocumentProxy, getMeta } from 'unpdf'

import type {
  DocumentTextInfo,
  DocumentTextOptions,
  DocumentTextProvider,
  DocumentTextResult,
} from '@molecule/api-document-text'

import type { PdfjsDocumentTextConfig } from './types.js'

/** Caps the provider applies (the hosted molecule.dev service mirrors them). */
export const DOCUMENT_TEXT_LIMITS = {
  maxTextChars: 500_000,
  maxPages: 500,
  maxPasswordChars: 256,
} as const

const fail = (message: string): never => {
  throw new Error(message)
}

/** One non-empty string field of the PDF's declared metadata, at most 2,000 chars. */
function metaString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const trimmed = v.trim()
  if (trimmed.length === 0) return undefined
  return trimmed.slice(0, 2000)
}

/**
 * pdf.js document text provider. Every extraction is bounded: the joined
 * text at `maxTextChars`, the returned pages at the call's `maxPages` (this
 * provider's `maxPages` config is the default). The parse itself is bounded
 * by the document bytes the caller hands in — keep the input sized (the
 * hosted service caps it at 8 MB; an in-process bond has no such cap).
 */
export class PdfjsDocumentTextProvider implements DocumentTextProvider {
  readonly name = 'pdfjs'

  private readonly maxTextChars: number
  private readonly defaultMaxPages: number

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its default.
   */
  constructor(config: PdfjsDocumentTextConfig = {}) {
    this.maxTextChars = config.maxTextChars ?? DOCUMENT_TEXT_LIMITS.maxTextChars
    this.defaultMaxPages = config.maxPages ?? DOCUMENT_TEXT_LIMITS.maxPages
  }

  /**
   * Extracts the text of one PDF document — no network.
   *
   * @param input - The document bytes, plus a password for an encrypted document.
   * @param options - Extract options (page bound, per-page texts).
   * @returns The extracted text.
   */
  async extract(
    input: { data: Uint8Array; password?: string },
    options?: DocumentTextOptions,
  ): Promise<DocumentTextResult> {
    if (!(input?.data instanceof Uint8Array) || input.data.length === 0) {
      fail('"data" must be non-empty PDF bytes (Uint8Array or Buffer).')
    }
    if (input.password !== undefined) {
      if (typeof input.password !== 'string' || input.password.length === 0) {
        fail('"password" must be non-empty text when given.')
      }
      if (input.password.length > DOCUMENT_TEXT_LIMITS.maxPasswordChars) {
        fail(
          `"password" is ${input.password.length} characters; the limit is ${DOCUMENT_TEXT_LIMITS.maxPasswordChars}.`,
        )
      }
    }
    const maxPages = options?.maxPages ?? this.defaultMaxPages
    if (
      typeof maxPages !== 'number' ||
      !Number.isInteger(maxPages) ||
      maxPages < 1 ||
      maxPages > DOCUMENT_TEXT_LIMITS.maxPages
    ) {
      fail(`"maxPages" must be an integer from 1 to ${DOCUMENT_TEXT_LIMITS.maxPages}.`)
    }
    const includePages = options?.includePages ?? true
    if (typeof includePages !== 'boolean') {
      fail('"includePages" must be a boolean.')
    }

    const pdf = await getDocumentProxy(
      input.data,
      input.password !== undefined ? { password: input.password } : undefined,
    )
    const { totalPages, text: pageTexts } = await extractText(pdf, { mergePages: false })

    const kept = pageTexts
      .slice(0, maxPages)
      .map((pageText, i) => ({ pageNumber: i + 1, text: pageText }))
    const joined = kept.map((p) => p.text).join('\n\n')
    const truncated = joined.length > this.maxTextChars
    const text = truncated ? joined.slice(0, this.maxTextChars) : joined

    let info: DocumentTextInfo | undefined
    try {
      const meta = await getMeta(pdf)
      const raw = (meta?.info ?? {}) as unknown as Record<string, unknown>
      const picked: DocumentTextInfo = {}
      for (const key of ['title', 'author', 'subject', 'creator', 'producer'] as const) {
        const value = metaString(raw[key.charAt(0).toUpperCase() + key.slice(1)])
        if (value !== undefined) picked[key] = value
      }
      if (Object.keys(picked).length > 0) info = picked
    } catch (_error) {
      // Metadata is optional; a document that refuses to open its info dict
      // still yields its text.
    }

    return {
      text,
      pages: includePages ? kept : [],
      pageCount: totalPages,
      truncated,
      pagesOmitted: totalPages - (includePages ? kept.length : 0),
      ...(info !== undefined ? { info } : {}),
    }
  }
}

/**
 * Create a pdf.js document text provider.
 *
 * @param config - Options; each falls back to its default.
 * @returns A `DocumentTextProvider` backed by pdf.js in this process.
 */
export function createProvider(config?: PdfjsDocumentTextConfig): DocumentTextProvider {
  return new PdfjsDocumentTextProvider(config)
}
