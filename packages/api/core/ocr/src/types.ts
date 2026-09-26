/**
 * Optical character recognition (OCR) type definitions.
 *
 * Defines the abstract contract for extracting text from images. Bond a
 * concrete provider to enable OCR in your application.
 *
 * @module
 */

/**
 * An image to recognize text in.
 */
export interface OcrInput {
  /** The image bytes. */
  data: Uint8Array
  /** The image's MIME type, e.g. `image/png`. */
  mimeType: string
}

/**
 * Options for one OCR pass.
 */
export interface OcrOptions {
  /**
   * Language hint. Providers interpret the code their own way — a vision
   * model takes any language name or BCP-47 tag (`de`, `zh-TW`), Tesseract
   * takes its traineddata codes (`eng`, `deu`). Omit for auto-detection.
   */
  language?: string
}

/**
 * Text recognized on one page.
 */
export interface OcrPage {
  /** 1-based page number (a single-image input always yields page 1). */
  pageNumber: number
  /** The text recognized on this page. */
  text: string
  /** The provider's mean confidence for this page, 0–1. Absent when the provider cannot score itself. */
  confidence?: number
}

/**
 * Result of recognizing text in one image.
 */
export interface OcrResult {
  /** All recognized text, pages joined with a blank line. */
  text: string
  /** Per-page breakdown (single-image input yields exactly one page). */
  pages: OcrPage[]
}

/**
 * OCR provider interface.
 *
 * Implement this interface in a bond package to extract text from images —
 * with a vision language model (`@molecule/api-ocr-llm`), self-hosted
 * Tesseract (`@molecule/api-ocr-tesseract`), or a hosted service
 * (`@molecule/api-ocr-molecule`).
 */
export interface OcrProvider {
  /** Provider name (e.g. 'llm', 'tesseract', 'molecule'). */
  readonly name: string

  /**
   * Recognize text in one image.
   *
   * @param input - The image bytes and MIME type.
   * @param options - Language hint.
   * @returns The recognized text, per page.
   */
  recognize(input: OcrInput, options?: OcrOptions): Promise<OcrResult>

  /**
   * Release provider resources (e.g. Tesseract's worker threads). Optional —
   * only providers that hold resources outside the JS heap implement it.
   */
  dispose?(): Promise<void>
}

/**
 * Configuration for the OCR provider.
 */
export interface OcrConfig {
  /** Default language hint when a call does not pass one. */
  language?: string
}
