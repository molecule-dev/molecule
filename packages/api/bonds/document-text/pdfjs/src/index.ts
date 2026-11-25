/**
 * pdf.js document text provider for `@molecule/api-document-text`.
 *
 * Extract the text of a PDF document in this process — pdf.js through
 * `unpdf`, no vendor account, no browser, no network. Wire it with the
 * core's `setProvider` and call `extractDocumentText`.
 *
 * @example
 * ```typescript
 * import { setProvider, extractDocumentText } from '@molecule/api-document-text'
 * import { provider as pdfjs } from '@molecule/api-document-text-pdfjs'
 *
 * setProvider(pdfjs)
 * const doc = await extractDocumentText({ data: bytes })
 * ```
 *
 * @remarks
 * - **Text extraction is not OCR.** A scanned or image-only page yields
 *   empty text — the words are pixels. Route those pages through the OCR
 *   service (`@molecule/api-ocr`) on rendered page images instead.
 * - **Encrypted documents** need `password`; a wrong or missing password is
 *   a password error (`PasswordException` as the `cause`), never a silent
 *   empty result.
 * - **This process parses the bytes you hand it** — keep the input sized.
 *   The hosted molecule.dev service caps a document at 8 MB; this bond has
 *   no cap of its own (an oversized document is your memory to spend).
 * - Caps applied to the result: 500,000 characters of joined text
 *   (`truncated`), the returned pages at `maxPages` (default 500;
 *   `pagesOmitted` reports the rest — a bound never silently drops pages).
 * - CJK and other non-Latin text decodes through the `pdfjs-dist` package
 *   this bond installs (its packed CMaps load from disk, not the network).
 * - The extracted text is untrusted input: it is content parsed out of an
 *   arbitrary document.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'

import type { DocumentTextProvider } from '@molecule/api-document-text'

import { PdfjsDocumentTextProvider } from './provider.js'

/** The provider implementation (wire with the core's `setProvider`). */
export const provider: DocumentTextProvider = new PdfjsDocumentTextProvider()
