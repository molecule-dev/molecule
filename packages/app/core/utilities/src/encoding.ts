/**
 * Encoding utilities for molecule.dev frontend applications.
 *
 * @module
 */

/**
 * Converts a URL-safe base64 string to a `Uint8Array`.
 * Commonly used for decoding VAPID public keys for push notification subscriptions.
 *
 * @param base64String - The URL-safe base64-encoded string (uses `-` and `_` instead of `+` and `/`).
 * @returns The decoded byte array.
 */
export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Converts a `Uint8Array` to a URL-safe base64 string.
 * The inverse of `urlBase64ToUint8Array`.
 *
 * @param array - The byte array to encode.
 * @returns The URL-safe base64-encoded string (trailing `=` padding removed).
 */
export const uint8ArrayToUrlBase64 = (array: Uint8Array): string => {
  const binary = String.fromCharCode(...array)
  const base64 = window.btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
