/**
 * Clipboard utilities for molecule.dev frontend applications.
 *
 * @module
 */

/**
 * Copies text to the system clipboard. Uses the Clipboard API when
 * available, with a `document.execCommand('copy')` fallback for
 * older browsers.
 *
 * @param text - The text to copy to the clipboard.
 * @returns `true` if the copy succeeded, `false` on failure.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  } catch {
    return false
  }
}

/**
 * Reads text from the system clipboard using the Clipboard API.
 *
 * @returns The clipboard text content, or `null` if reading is not supported or fails.
 */
export const readFromClipboard = async (): Promise<string | null> => {
  try {
    if (navigator.clipboard?.readText) {
      return await navigator.clipboard.readText()
    }
    return null
  } catch {
    return null
  }
}
