/**
 * Clipboard utilities for molecule.dev frontend applications.
 *
 * Prefer `@molecule/app-clipboard`: its `copyTextWithFallback()` and `readText()`
 * go through the bonded clipboard provider (the default apps bond the web one), so
 * a native or test provider can be swapped in. These two helpers call the browser
 * directly and stay for existing callers.
 *
 * @module
 */

/**
 * Copies `text` with the legacy copy command, through a hidden, selected textarea.
 *
 * @param text - The text to copy.
 * @returns Whether the browser reports the copy as done.
 */
const copyWithCommand = (text: string): boolean => {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  try {
    textarea.select()
    return document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
}

/**
 * Copies text to the system clipboard. Uses the Clipboard API when it is
 * available, and the legacy copy command where it is missing (a plain-HTTP page)
 * or refuses the write (an iframe without the clipboard-write permission, a
 * document without focus).
 *
 * @deprecated Use `copyTextWithFallback()` from `@molecule/app-clipboard`, which
 * copies through the bonded clipboard provider.
 * @param text - The text to copy to the clipboard.
 * @returns `true` if the copy succeeded, `false` when no copy was possible.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (_error) {
    // The Clipboard API refused (permission, focus, insecure context): the copy
    // command below is the fallback for exactly that case.
  }
  try {
    return copyWithCommand(text)
  } catch (_error) {
    // Best-effort: a browser can throw from execCommand where copying is blocked;
    // `false` is the documented contract and the caller shows no success state.
    return false
  }
}

/**
 * Reads text from the system clipboard using the Clipboard API.
 *
 * @deprecated Use `readText()` from `@molecule/app-clipboard`, which reads through
 * the bonded clipboard provider.
 * @returns The clipboard text content, or `null` if reading is not supported or fails.
 */
export const readFromClipboard = async (): Promise<string | null> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      return await navigator.clipboard.readText()
    }
    return null
  } catch (_error) {
    // Best-effort: readText can fail due to permissions denial or lack of
    // Clipboard API support — returning null is the documented contract.
    return null
  }
}
