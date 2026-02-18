/**
 * `@molecule/app-clipboard`
 * Clipboard convenience functions
 */

import { t } from '@molecule/app-i18n'
import { warn } from '@molecule/app-logger'

import { getProvider } from './provider.js'
import type {
  ClipboardCapabilities,
  ClipboardChangeEvent,
  ClipboardContent,
  ClipboardDataType,
  ReadOptions,
  WriteOptions,
} from './types.js'

/**
 * Write content to clipboard
 * @param content - Content to write
 * @param options - Write options
 * @returns A promise that resolves when the content is written.
 */
export async function write(content: ClipboardContent, options?: WriteOptions): Promise<void> {
  return getProvider().write(content, options)
}

/**
 * Write plain text to clipboard
 * @param text - Text to write
 * @returns A promise that resolves when the text is written.
 */
export async function writeText(text: string): Promise<void> {
  return getProvider().writeText(text)
}

/**
 * Write HTML to clipboard
 * @param html - HTML to write
 * @param fallbackText - Plain text fallback
 * @returns A promise that resolves when the HTML is written.
 */
export async function writeHtml(html: string, fallbackText?: string): Promise<void> {
  return getProvider().writeHtml(html, fallbackText)
}

/**
 * Write image to clipboard
 * @param image - Image as base64 data URL or Blob
 * @returns A promise that resolves when the image is written.
 */
export async function writeImage(image: string | Blob): Promise<void> {
  return getProvider().writeImage(image)
}

/**
 * Read content from clipboard
 * @param options - Read options
 * @returns The clipboard content including text, HTML, image, or raw data.
 */
export async function read(options?: ReadOptions): Promise<ClipboardContent> {
  return getProvider().read(options)
}

/**
 * Read plain text from clipboard
 * @returns The plain text string from the clipboard.
 */
export async function readText(): Promise<string> {
  return getProvider().readText()
}

/**
 * Read HTML from clipboard
 * @returns The HTML string from the clipboard, or null if unavailable.
 */
export async function readHtml(): Promise<string | null> {
  return getProvider().readHtml()
}

/**
 * Read image from clipboard
 * @returns The image as a base64 data URL, or null if unavailable.
 */
export async function readImage(): Promise<string | null> {
  return getProvider().readImage()
}

/**
 * Clear the clipboard
 * @returns A promise that resolves when the clipboard is cleared.
 */
export async function clear(): Promise<void> {
  return getProvider().clear()
}

/**
 * Check if clipboard has content
 * @returns Whether the clipboard currently has content.
 */
export async function hasContent(): Promise<boolean> {
  return getProvider().hasContent()
}

/**
 * Get available content types in clipboard
 * @returns The list of MIME types available in the clipboard.
 */
export async function getAvailableTypes(): Promise<ClipboardDataType[]> {
  return getProvider().getAvailableTypes()
}

/**
 * Get clipboard capabilities
 * @returns The clipboard capabilities indicating supported operations.
 */
export async function getCapabilities(): Promise<ClipboardCapabilities> {
  return getProvider().getCapabilities()
}

/**
 * Listen for clipboard changes (if supported)
 * @param callback - Called when clipboard content changes
 * @returns Unsubscribe function to stop listening for changes.
 */
export function onChange(callback: (event: ClipboardChangeEvent) => void): () => void {
  const provider = getProvider()
  if (!provider.onChange) {
    warn(
      t('clipboard.warn.onChangeNotSupported', undefined, {
        defaultValue: '@molecule/app-clipboard: onChange not supported by provider',
      }),
    )
    return () => {}
  }
  return provider.onChange(callback)
}
