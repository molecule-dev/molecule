/**
 * `@molecule/app-clipboard`
 * Utility functions for clipboard
 */

import { readText, writeText } from './clipboard.js'
import { hasProvider } from './provider.js'

/**
 * Copies `text` with the legacy copy command, through a hidden, selected textarea.
 *
 * @param text - The text to copy.
 * @returns Whether the browser reports the copy as done; `false` where there is no document.
 */
function copyWithCommand(text: string): boolean {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    return document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
}

/**
 * Copy text to the clipboard with a browser fallback. Uses the bonded provider when
 * there is one, and the deprecated `document.execCommand('copy')` where no provider is
 * bonded or the provider refuses the write (an iframe without the clipboard-write
 * permission, a document without focus). Never throws.
 * @param text - The text to copy to the clipboard.
 * @returns Whether the text was successfully copied.
 */
export async function copyTextWithFallback(text: string): Promise<boolean> {
  if (hasProvider()) {
    try {
      await writeText(text)
      return true
    } catch (_error) {
      // The provider refused (permission, focus, insecure context): the copy command
      // below is the fallback for exactly that case.
    }
  }
  try {
    return copyWithCommand(text)
  } catch (_error) {
    // A browser can throw from execCommand where copying is blocked; returning false
    // is the documented contract and the caller decides how to handle it.
    return false
  }
}

/**
 * Check if the given text matches the current clipboard content.
 * @param text - The text to compare against the clipboard.
 * @returns Whether the clipboard contains the exact same text.
 */
export async function isTextInClipboard(text: string): Promise<boolean> {
  try {
    const clipboardText = await readText()
    return clipboardText === text
  } catch (_error) {
    // Clipboard read can fail due to missing permissions or unsupported environment;
    // returning false is the documented contract and the caller decides how to handle it.
    return false
  }
}
