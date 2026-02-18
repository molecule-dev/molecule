/**
 * `@molecule/app-nfc`
 * Utility functions for NFC module
 */

/**
 * Format an NFC tag ID as a colon-separated uppercase hex string (e.g., '04:A2:B3:C4').
 * If the ID is already hex digits, inserts colons between byte pairs.
 * @param id - The raw tag ID string.
 * @returns The formatted tag ID.
 */
export function formatTagId(id: string): string {
  // Already hex? Return with colons
  if (/^[0-9A-Fa-f]+$/.test(id)) {
    return (
      id
        .match(/.{1,2}/g)
        ?.join(':')
        .toUpperCase() ?? id
    )
  }
  return id
}

/**
 * Check if a URI is a deep link (custom scheme) rather than an HTTP/HTTPS URL.
 * @param uri - The URI to check.
 * @returns Whether the URI uses a custom scheme (not http:// or https://).
 */
export function isDeepLink(uri: string): boolean {
  return !uri.startsWith('http://') && !uri.startsWith('https://')
}
