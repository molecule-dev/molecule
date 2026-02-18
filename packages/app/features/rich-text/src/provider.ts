/**
 * Rich text provider management for molecule.dev.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import { createSimpleRichTextProvider } from './editor.js'
import type { EditorOptions, RichTextEditor, RichTextProvider, RichTextValue } from './types.js'

const BOND_TYPE = 'rich-text'

/**
 * Set the rich text provider.
 * @param provider - RichTextProvider implementation to register.
 */
export const setProvider = (provider: RichTextProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current rich text provider. Falls back to a simple contentEditable-based
 * provider if none has been explicitly set.
 * @returns The active RichTextProvider instance.
 */
export const getProvider = (): RichTextProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createSimpleRichTextProvider())
  }
  return bondGet<RichTextProvider>(BOND_TYPE)!
}

/**
 * Check if a rich text provider has been registered.
 * @returns Whether a RichTextProvider has been bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Create a new rich text editor instance using the current provider.
 * @param options - Editor configuration (container, toolbar, initial value, etc.).
 * @returns A RichTextEditor instance for controlling the editor.
 */
export const createEditor = (options: EditorOptions): RichTextEditor =>
  getProvider().createEditor(options)

/**
 * Create an empty rich text value suitable for initializing an editor.
 * @returns An empty RichTextValue in the provider's internal format.
 */
export const createEmptyValue = (): RichTextValue => getProvider().createEmptyValue()

/**
 * Convert an HTML string to the provider's internal rich text format.
 * @param html - The HTML string to convert.
 * @returns A RichTextValue representing the HTML content.
 */
export const htmlToValue = (html: string): RichTextValue => getProvider().htmlToValue(html)

/**
 * Convert a plain text string to the provider's internal rich text format.
 * @param text - The plain text string to convert.
 * @returns A RichTextValue representing the text content.
 */
export const textToValue = (text: string): RichTextValue => getProvider().textToValue(text)
