/**
 * `@molecule/app-clipboard`
 * Utility functions for clipboard
 */

import { readText, writeText } from './clipboard.js'
import { hasProvider } from './provider.js'

/**
 * Copy text to the clipboard with a browser fallback. Uses the native provider if
 * available, otherwise falls back to the deprecated `document.execCommand('copy')`.
 * @param text - The text to copy to the clipboard.
 * @returns Whether the text was successfully copied.
 */
export async function copyTextWithFallback(text: string): Promise<boolean> {
  try {
    if (hasProvider()) {
      await writeText(text)
      return true
    }

    // Web fallback using execCommand
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        const success = document.execCommand('copy')
        return success
      } finally {
        document.body.removeChild(textarea)
      }
    }

    return false
  } catch {
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
  } catch {
    return false
  }
}
